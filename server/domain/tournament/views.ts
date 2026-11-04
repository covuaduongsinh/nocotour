// Dữ liệu công khai / trọng tài / học viên: bảng xếp hạng, cặp đấu, tóm tắt "Giải đấu & Elo", tổng quan trọng tài (chuyển từ v2 service.ts).
// Quy tắc T7: không có đồng ý công bố thì chỉ hiện "Kỳ thủ #<số xuất phát>".
import { TournamentError } from './errors.js';
import { PARENT_ROLE, REFEREE_ROLES, CONFIRMED, VIEW_ROLES, clean, hasRole, isManager, loadBang, need, publicName, rankPlayers, requireReferee } from './common.js';
import type { Actor, Bang, Giai, Id, Player, TournamentStore as Store } from './types.js';

async function resolveVisible(store: Store, actor: Actor | null, input: { slug?: string; bangDauId?: Id }) {
  const referee = hasRole(actor, REFEREE_ROLES);
  let giai: Giai;
  let bangs: Bang[];
  if (input.bangDauId !== undefined && input.bangDauId !== null && referee) {
    const loaded = await loadBang(store, input.bangDauId);
    giai = loaded.giai;
    bangs = [loaded.bang];
  } else {
    giai = need(await store.getGiaiBySlug(need(input.slug, 400, 'Thiếu slug')), 404, 'Không có giải này');
    if (!referee && !['dang_dien_ra', 'ket_thuc'].includes(String(giai.trang_thai))) {
      throw new TournamentError(404, 'Không có giải này');
    }
    bangs = await store.listBang(giai.id);
    if (input.bangDauId !== undefined && input.bangDauId !== null) {
      bangs = bangs.filter((bang) => String(bang.id) === String(input.bangDauId));
      if (!bangs.length) {
        throw new TournamentError(404, 'Không có bảng đấu này');
      }
    }
  }
  return { giai, bangs, full: referee };
}

export async function standingsAction(store: Store, actor: Actor | null, input: { slug?: string; bangDauId?: Id }) {
  const { giai, bangs, full } = await resolveVisible(store, actor, input);
  const out = [];
  for (const bang of bangs) {
    const players = await store.listPlayers(bang.id);
    const rows = rankPlayers(players, await store.listGames(bang.id), bang.vong_hien_tai);
    const byId = new Map(players.map((player) => [String(player.id), player]));
    out.push({
      id: bang.id,
      ten: bang.ten,
      the_thuc: bang.the_thuc,
      so_vong: bang.so_vong,
      vong_hien_tai: bang.vong_hien_tai,
      xep_hang: rows.map((row) => {
        const player = byId.get(String(row.id)) as Player;
        return {
          hang: row.rank,
          so_xuat_phat: player.so_xuat_phat,
          ten: publicName(player, full),
          nam_sinh: player.nam_sinh,
          clb: player.clb,
          diem: row.points,
          buchholz_cat1: row.buchholzCut1,
          buchholz: row.buchholz,
          sonneborn: row.sonneborn,
          so_thang: row.wins,
        };
      }),
    });
  }
  return { giai: { ten: giai.ten, slug: giai.slug, trang_thai: giai.trang_thai }, bang: out };
}

export async function pairingsAction(store: Store, actor: Actor | null, input: { slug?: string; bangDauId?: Id; vong?: number }) {
  const { giai, bangs, full } = await resolveVisible(store, actor, input);
  const out = [];
  for (const bang of bangs) {
    const vong = input.vong === undefined || input.vong === null ? bang.vong_hien_tai : Math.floor(Number(input.vong));
    if (!Number.isFinite(vong) || vong < 1) {
      throw new TournamentError(400, 'vong phải là số nguyên từ 1');
    }
    // Vòng chưa công bố thì không lộ cặp đấu (trọng tài vẫn xem được).
    if (vong > bang.vong_hien_tai && !full) {
      out.push({ id: bang.id, ten: bang.ten, vong, van_dau: [] });
      continue;
    }
    const players = await store.listPlayers(bang.id);
    const byId = new Map(players.map((player) => [String(player.id), player]));
    const games = (await store.listGames(bang.id)).filter((game) => game.vong === vong).sort((a, b) => a.ban - b.ban);
    out.push({
      id: bang.id,
      ten: bang.ten,
      vong,
      van_dau: games.map((game) => ({
        ban: game.ban,
        trang: publicName(byId.get(String(game.trangId)), full),
        den: game.denId === null ? null : publicName(byId.get(String(game.denId)), full),
        ket_qua: game.ket_qua,
        ...(full ? { id: game.id, doi_tay: game.doi_tay } : {}),
      })),
    });
  }
  return { giai: { ten: giai.ten, slug: giai.slug, trang_thai: giai.trang_thai }, bang: out };
}

// Bản dành cho trọng tài (đăng nhập): thấy đủ họ tên, cả giải nháp / vòng chưa công bố. Action công khai (`standings` / `pairings`) KHÔNG nhận diện người gọi
// (ACL `public` có thể bỏ qua đăng nhập) nên luôn áp quy tắc công khai T7; giao diện nội bộ gọi hai action này.
export async function refereeStandings(store: Store, actor: Actor, input: { bangDauId?: Id }) {
  requireReferee(actor);
  return standingsAction(store, actor, { bangDauId: need(input.bangDauId, 400, 'Thiếu bangDauId') });
}

export async function refereePairings(store: Store, actor: Actor, input: { bangDauId?: Id; vong?: number }) {
  requireReferee(actor);
  return pairingsAction(store, actor, { bangDauId: need(input.bangDauId, 400, 'Thiếu bangDauId'), vong: input.vong });
}

// ---------------------------------------------------------------- "Giải đấu & Elo" của một học viên (4.1-4, mobile phụ huynh / hồ sơ)
const BLACK_SCORE: Record<string, number> = { '1-0': 0, '0-1': 1, '1/2': 0.5, '+-': 0, '-+': 1, '--': 0 };
const WHITE_SCORE: Record<string, number> = { '1-0': 1, '0-1': 0, '1/2': 0.5, '+-': 1, '-+': 0, '--': 0, bye: 1 };

/**
 * Elo hiện tại + lịch sử Elo, các giải em đã / đang tham gia (hạng, điểm, ván của em), giấy khen. Phụ huynh chỉ con mình, nhân viên mọi em.
 * Tên đối thủ chỉ hiện khi đối thủ đồng ý công bố (quy tắc T7), nếu không là "Kỳ thủ #số xuất phát"; không SĐT / email / ngày sinh của ai. Giải nháp bị ẩn.
 */
export async function mySummary(store: Store, actor: Actor, input: { hocVienId?: Id }) {
  const hocVienId = need(input.hocVienId, 400, 'Thiếu hocVienId');
  if (!hasRole(actor, VIEW_ROLES)) {
    const allowed = actor.roles.includes(PARENT_ROLE) && actor.userId !== null && (await store.isParentOf(actor.userId, hocVienId));
    if (!allowed) {
      throw new TournamentError(403, 'Không có quyền với học viên này');
    }
  }
  const student = need((await store.getStudents([hocVienId]))[0], 404, 'Không có học viên này');
  const giaiCache = new Map<string, Giai | null>();
  const giaiOf = async (id: Id) => {
    if (!giaiCache.has(String(id))) {
      giaiCache.set(String(id), await store.getGiai(id));
    }
    return giaiCache.get(String(id)) ?? null;
  };
  const tournaments = [];
  for (const player of await store.listPlayersOfStudent(hocVienId)) {
    const bang = await store.getBang(player.bangDauId);
    const giai = bang ? await giaiOf(bang.giaiDauId) : null;
    if (!bang || !giai || giai.trang_thai === 'nhap') {
      continue;
    }
    const allPlayers = await store.listPlayers(bang.id);
    const byId = new Map(allPlayers.map((item) => [String(item.id), item]));
    const games = (await store.listGames(bang.id)).filter((game) => game.vong <= bang.vong_hien_tai);
    const ranking = rankPlayers(allPlayers, games, bang.vong_hien_tai).find((row) => String(row.id) === String(player.id));
    const mine = games
      .filter((game) => String(game.trangId) === String(player.id) || String(game.denId) === String(player.id))
      .sort((a, b) => a.vong - b.vong)
      .map((game) => {
        const white = String(game.trangId) === String(player.id);
        const opponentId = white ? game.denId : game.trangId;
        const result = game.ket_qua;
        return {
          vong: game.vong,
          ban: game.ban,
          mau: white ? 'trang' : 'den',
          doi_thu: opponentId === null ? null : publicName(byId.get(String(opponentId)), false),
          ket_qua: result,
          diem: result === 'chua_co' ? null : white ? (WHITE_SCORE[result] ?? 0) : (BLACK_SCORE[result] ?? 0),
        };
      });
    tournaments.push({
      giai: giai.ten,
      slug: giai.slug,
      trang_thai: giai.trang_thai,
      bang: bang.ten,
      ma_dang_ky: player.ma_dang_ky ?? null,
      so_xuat_phat: player.so_xuat_phat,
      dang_ky: player.trang_thai,
      hang: ranking?.rank ?? null,
      diem: ranking?.points ?? 0,
      van_dau: mine,
    });
  }
  const history = [];
  for (const row of await store.listEloOfStudent(hocVienId)) {
    const giai = await giaiOf(row.giaiDauId);
    history.push({ giai: giai?.ten ?? null, ngay: row.ngay ?? null, elo_truoc: row.elo_truoc, elo_sau: row.elo_sau, thay_doi: row.thay_doi, so_van: row.so_van });
  }
  history.sort((a, b) => String(a.ngay ?? '').localeCompare(String(b.ngay ?? '')));
  const medals = [];
  for (const medal of await store.listGiayKhenOfStudent(hocVienId)) {
    const bang = await store.getBang(medal.bangDauId);
    const giai = bang ? await giaiOf(bang.giaiDauId) : null;
    medals.push({ id: medal.id, so: medal.so, hang: medal.hang, bang: bang?.ten ?? null, giai: giai?.ten ?? null, ngay_cap: medal.ngay_cap });
  }
  return {
    hoc_vien: { id: student.id, ho_ten: student.ho_ten },
    elo: { hien_tai: student.elo, so_van: student.so_van_elo, lich_su: history },
    giai: tournaments,
    giay_khen: medals,
  };
}

// ---------------------------------------------------------------- dữ liệu cho giao diện trọng tài (4.1-4)
/** Giải + bảng + lớp cho các khối chọn của giao diện trọng tài (desktop "Vòng đấu" / "Kỳ thủ", mobile "Trọng tài"). Chỉ trọng tài. */
export async function refereeOverview(store: Store, actor: Actor) {
  requireReferee(actor);
  const giaiList = [];
  for (const giai of await store.listGiai()) {
    const bangs = [];
    for (const bang of await store.listBang(giai.id)) {
      const players = await store.listPlayers(bang.id);
      bangs.push({
        id: bang.id,
        ten: bang.ten,
        the_thuc: bang.the_thuc,
        so_vong: bang.so_vong,
        vong_hien_tai: bang.vong_hien_tai,
        trang_thai: bang.trang_thai,
        so_ky_thu: players.filter((player) => player.trang_thai !== 'rut_lui').length,
        so_xac_nhan: players.filter((player) => player.trang_thai === CONFIRMED).length,
      });
    }
    giaiList.push({ id: giai.id, ten: giai.ten, slug: giai.slug, trang_thai: giai.trang_thai, ngay_bat_dau: giai.ngay_bat_dau, bang: bangs });
  }
  return { giai: giaiList, lop: await store.listClasses(), quan_ly: isManager(actor) };
}

/** Tìm học viên để thêm vào bảng đấu (trọng tài). */
export async function findStudents(store: Store, actor: Actor, input: { q?: string }) {
  requireReferee(actor);
  const query = clean(input.q, 60);
  if (query.length < 2) {
    return { hoc_vien: [] };
  }
  return { hoc_vien: await store.searchStudents(query, 20) };
}
