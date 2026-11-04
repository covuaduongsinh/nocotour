// Kết thúc giải (Elo, giấy khen), xuất TRF, tra giấy khen (chuyển từ v2 service.ts dòng 482–628).
import { computeElo, initialElo } from './elo.js';
import { trf16 } from './trf.js';
import { TournamentError } from './errors.js';
import { CONFIRMED, PARENT_ROLE, VIEW_ROLES, hasRole, isManager, loadBang, need, rankPlayers, requireReferee, todayOf, writeStandings } from './common.js';
import type { Actor, Id, Player, TournamentStore as Store } from './types.js';

// ---------------------------------------------------------------- kết thúc giải
export async function finish(store: Store, actor: Actor, input: { giaiDauId?: Id }) {
  if (!isManager(actor)) {
    throw new TournamentError(403, 'Chỉ quản lý được kết thúc giải');
  }
  const giai = need(await store.getGiai(need(input.giaiDauId, 400, 'Thiếu giaiDauId')), 404, 'Không có giải này');
  if (giai.trang_thai === 'nhap') {
    throw new TournamentError(409, 'Giải còn ở trạng thái nháp');
  }
  const bangs = await store.listBang(giai.id);
  const loaded = [];
  for (const bang of bangs) {
    const games = await store.listGames(bang.id);
    const open = games.filter((game) => game.denId !== null && game.ket_qua === 'chua_co');
    if (open.length) {
      throw new TournamentError(409, `Bảng ${bang.ten ?? bang.id} còn ${open.length} ván chưa có kết quả`);
    }
    loaded.push({ bang, games, players: await store.listPlayers(bang.id) });
  }
  const today = todayOf(store.now());
  const giayKhen: Array<{ so: string; hang: number; ho_ten: string; bang: string | null }> = [];
  const playerRating = new Map<string, number>();
  const students = await store.getStudents(loaded.flatMap((entry) => entry.players.filter((p) => p.hocVienId !== null).map((p) => p.hocVienId as Id)));
  const studentById = new Map(students.map((student) => [String(student.id), student]));
  const previous = new Map((await store.listEloOfGiai(giai.id)).map((row) => [String(row.hocVienId), row]));
  const startRating = (player: Player) => {
    if (player.hocVienId === null) {
      return player.elo_khai_bao ?? 800;
    }
    const prior = previous.get(String(player.hocVienId));
    if (prior) {
      return prior.elo_truoc;
    }
    const student = studentById.get(String(player.hocVienId));
    return student?.elo ?? initialElo(student?.capThuTu ?? null);
  };
  const eloGames = new Map<string, { id: Id; rating: number; games: Array<{ opponentRating: number; score: number }> }>();
  for (const entry of loaded) {
    for (const player of entry.players) {
      playerRating.set(String(player.id), startRating(player));
    }
  }
  for (const entry of loaded) {
    const byId = new Map(entry.players.map((player) => [String(player.id), player]));
    for (const game of entry.games) {
      if (game.denId === null || !['1-0', '0-1', '1/2'].includes(game.ket_qua)) {
        continue;
      }
      const white = byId.get(String(game.trangId));
      const black = byId.get(String(game.denId));
      if (!white || !black) {
        continue;
      }
      const scoreWhite = game.ket_qua === '1-0' ? 1 : game.ket_qua === '0-1' ? 0 : 0.5;
      for (const [me, other, score] of [[white, black, scoreWhite], [black, white, 1 - scoreWhite]] as Array<[Player, Player, number]>) {
        if (me.hocVienId === null) {
          continue;
        }
        const key = String(me.hocVienId);
        const slot = eloGames.get(key) ?? { id: me.hocVienId, rating: playerRating.get(String(me.id)) as number, games: [] };
        slot.games.push({ opponentRating: playerRating.get(String(other.id)) as number, score });
        eloGames.set(key, slot);
      }
    }
  }
  const changes = computeElo([...eloGames.values()]);
  for (const change of changes) {
    const prior = previous.get(String(change.id));
    const student = studentById.get(String(change.id));
    const baseElo = (student?.elo ?? change.before) - (prior ? prior.thay_doi : 0);
    const baseGames = (student?.so_van_elo ?? 0) - (prior ? prior.so_van : 0);
    await store.saveElo({ giaiDauId: giai.id, hocVienId: change.id, elo_truoc: change.before, elo_sau: change.after, thay_doi: change.change, so_van: change.games, ngay: today });
    await store.setStudentElo(change.id, baseElo + change.change, baseGames + change.games);
  }
  for (const entry of loaded) {
    const rows = await writeStandings(store, entry.bang);
    const byId = new Map(entry.players.map((player) => [String(player.id), player]));
    for (const row of rows) {
      const player = byId.get(String(row.id)) as Player;
      if (row.rank <= giai.so_giai_thuong && entry.games.length) {
        const created = await store.saveGiayKhen({ kyThuId: player.id, bangDauId: entry.bang.id, hocVienId: player.hocVienId, hang: row.rank, ho_ten_tren_giay: player.ho_ten, ngay_cap: today });
        giayKhen.push({ so: created.so, hang: row.rank, ho_ten: player.ho_ten, bang: entry.bang.ten });
      }
    }
    await store.updateBang(entry.bang.id, { trang_thai: 'ket_thuc' });
  }
  await store.updateGiai(giai.id, { trang_thai: 'ket_thuc' });
  return { elo: changes.map((change) => ({ hocVienId: change.id, truoc: change.before, sau: change.after, thay_doi: change.change, so_van: change.games })), giay_khen: giayKhen };
}

// ---------------------------------------------------------------- TRF, giấy khen
export async function trf(store: Store, actor: Actor, input: { bangDauId?: Id }) {
  requireReferee(actor);
  const { bang, giai } = await loadBang(store, input.bangDauId);
  const players = (await store.listPlayers(bang.id)).filter((player) => player.trang_thai === CONFIRMED);
  const games = await store.listGames(bang.id);
  const rows = new Map(rankPlayers(players, games, bang.vong_hien_tai).map((row) => [String(row.id), row]));
  const toTrf = players
    .filter((player) => player.so_xuat_phat !== null)
    .map((player) => {
      const row = rows.get(String(player.id));
      return {
        id: player.id,
        seed: player.so_xuat_phat as number,
        name: player.ho_ten,
        sex: player.gioi_tinh === 'nam' ? ('m' as const) : player.gioi_tinh === 'nu' ? ('w' as const) : null,
        rating: player.elo_xep ?? player.elo_khai_bao,
        birthYear: player.nam_sinh,
        points: row?.points ?? 0,
        rank: row?.rank ?? 0,
      };
    });
  const content = trf16(
    {
      name: `${giai.ten ?? ''} - ${bang.ten ?? ''}`,
      startDate: giai.ngay_bat_dau?.replace(/-/g, '/'),
      endDate: giai.ngay_ket_thuc?.replace(/-/g, '/'),
      rounds: bang.so_vong ?? Math.max(0, ...games.map((game) => game.vong)),
      type: bang.the_thuc === 'vong_tron' ? 'Round robin' : 'Swiss system',
      timeControl: bang.thoi_gian ?? '',
      city: giai.dia_diem ?? '',
    },
    toTrf,
    games.filter((game) => game.trangId !== null).map((game) => ({ round: game.vong, white: game.trangId as Id, black: game.denId, result: game.ket_qua })),
  );
  return { filename: `giai-${giai.slug ?? giai.id}-bang-${bang.id}.trf`, content };
}

export async function certificate(store: Store, actor: Actor, input: { giayKhenId?: Id }) {
  const giayKhen = need(await store.getGiayKhen(need(input.giayKhenId, 400, 'Thiếu giayKhenId')), 404, 'Không có giấy khen này');
  if (!hasRole(actor, VIEW_ROLES)) {
    const allowed = actor.roles.includes(PARENT_ROLE) && actor.userId !== null && giayKhen.hocVienId !== null && (await store.isParentOf(actor.userId, giayKhen.hocVienId));
    if (!allowed) {
      throw new TournamentError(403, 'Không có quyền với giấy khen này');
    }
  }
  const { bang, giai } = await loadBang(store, giayKhen.bangDauId);
  return {
    so: giayKhen.so,
    hang: giayKhen.hang,
    ho_ten: giayKhen.ho_ten_tren_giay,
    bang: bang.ten,
    giai: giai.ten,
    ngay_cap: giayKhen.ngay_cap,
    co_so: giai.coSoId !== null ? await store.getCoSoName(giai.coSoId) : null,
  };
}
