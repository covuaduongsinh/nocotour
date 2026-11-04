// Đăng ký bằng nhân viên, xếp cặp, đổi cặp, nhập kết quả (chuyển từ v2 service.ts dòng 163–383). Truy cập dữ liệu qua `TournamentStore`.
import { pairRound } from './swiss.js';
import { roundRobin } from './roundRobin.js';
import { initialElo } from './elo.js';
import { TournamentError } from './errors.js';
import { CONFIRMED, RESULTS, gameView, loadBang, need, requireReferee, writeStandings } from './common.js';
import type { Actor, Game, Id, Player, TournamentStore as Store } from './types.js';

// ---------------------------------------------------------------- đăng ký
export async function enroll(store: Store, actor: Actor, input: { bangDauId?: Id; hocVienIds?: Id[]; lopId?: Id }) {
  requireReferee(actor);
  const { bang, giai } = await loadBang(store, input.bangDauId);
  if (!['nhap', 'mo_dang_ky', 'dong_dang_ky'].includes(String(giai.trang_thai))) {
    throw new TournamentError(409, 'Giải đã diễn ra hoặc đã kết thúc: không đăng ký thêm được');
  }
  const ids = new Set<string>((input.hocVienIds ?? []).map(String));
  if (input.lopId !== undefined && input.lopId !== null) {
    for (const id of await store.studentIdsOfClass(input.lopId)) {
      ids.add(String(id));
    }
  }
  if (!ids.size) {
    throw new TournamentError(400, 'Cần hocVienIds hoặc lopId');
  }
  const existing = await store.listPlayers(bang.id);
  const enrolled = new Set(existing.filter((player) => player.hocVienId !== null).map((player) => String(player.hocVienId)));
  const added: Id[] = [];
  const skipped: Array<{ hocVienId: Id; ly_do: string }> = [];
  for (const student of await store.getStudents([...ids])) {
    if (enrolled.has(String(student.id))) {
      skipped.push({ hocVienId: student.id, ly_do: 'Đã đăng ký bảng này' });
      continue;
    }
    const year = student.ngay_sinh ? Number(student.ngay_sinh.slice(0, 4)) : null;
    if (year !== null && ((bang.nam_sinh_tu !== null && year < bang.nam_sinh_tu) || (bang.nam_sinh_den !== null && year > bang.nam_sinh_den))) {
      skipped.push({ hocVienId: student.id, ly_do: `Năm sinh ${year} ngoài khoảng của bảng` });
      continue;
    }
    const fee = giai.mien_phi_hoc_vien ? 0 : bang.le_phi;
    const player = await store.createPlayer({
      bangDauId: bang.id,
      hocVienId: student.id,
      ho_ten: student.ho_ten ?? '',
      nam_sinh: year,
      gioi_tinh: student.gioi_tinh,
      clb: 'Dương Sinh',
      trang_thai: fee > 0 ? 'cho_thanh_toan' : CONFIRMED,
      elo_khai_bao: student.elo ?? initialElo(student.capThuTu),
      elo_xep: null,
      so_xuat_phat: null,
      dong_y_cong_bo: false,
      le_phi: fee,
      da_thu: 0,
      nguon: 'nhan_vien',
    });
    added.push(player.id);
  }
  return { da_them: added, bo_qua: skipped };
}

// ---------------------------------------------------------------- xếp cặp
async function assignSeeds(store: Store, players: Player[]) {
  const students = await store.getStudents(players.filter((p) => p.hocVienId !== null).map((p) => p.hocVienId as Id));
  const studentById = new Map(students.map((student) => [String(student.id), student]));
  const rated = players.map((player) => {
    const student = player.hocVienId !== null ? studentById.get(String(player.hocVienId)) : undefined;
    const rating = player.elo_xep ?? player.elo_khai_bao ?? student?.elo ?? initialElo(student?.capThuTu ?? null);
    return { player, rating };
  });
  const used = rated.map((entry) => entry.player.so_xuat_phat).filter((seed): seed is number => seed !== null);
  let next = used.length ? Math.max(...used) + 1 : 1;
  const missing = rated.filter((entry) => entry.player.so_xuat_phat === null).sort((a, b) => b.rating - a.rating || a.player.ho_ten.localeCompare(b.player.ho_ten, 'vi'));
  for (const entry of missing) {
    entry.player.so_xuat_phat = next;
    next += 1;
  }
  for (const entry of rated) {
    await store.updatePlayer(entry.player.id, { elo_xep: entry.rating, so_xuat_phat: entry.player.so_xuat_phat });
    entry.player.elo_xep = entry.rating;
  }
}

export async function pair(store: Store, actor: Actor, input: { bangDauId?: Id; vong?: number; force?: boolean }) {
  requireReferee(actor);
  const { bang, giai } = await loadBang(store, input.bangDauId);
  if (!['mo_dang_ky', 'dong_dang_ky', 'dang_dien_ra'].includes(String(giai.trang_thai))) {
    throw new TournamentError(409, 'Giải chưa mở hoặc đã kết thúc');
  }
  const vong = Math.floor(Number(need(input.vong, 400, 'Thiếu vong')));
  if (!Number.isFinite(vong) || vong < 1) {
    throw new TournamentError(400, 'vong phải là số nguyên từ 1');
  }
  const roundRobinMode = bang.the_thuc === 'vong_tron';
  const players = (await store.listPlayers(bang.id)).filter((player) => player.trang_thai !== 'rut_lui');
  const confirmed = players.filter((player) => player.trang_thai === CONFIRMED);
  if (confirmed.length < 2) {
    throw new TournamentError(409, 'Cần ít nhất 2 kỳ thủ đã xác nhận');
  }
  let games = await store.listGames(bang.id);
  const current = bang.vong_hien_tai; // v2: `let` và gán lại `current = vong - 1` sau khi chạy lại vòng, nhưng không dùng về sau (bỏ gán chết)
  if (vong <= current) {
    // Chạy lại vòng đã công bố: chỉ khi `force`, đúng vòng hiện tại và vòng đó chưa có kết quả nào (vòng tròn: chỉ vòng 1 và chưa vòng nào có kết quả).
    const scope = roundRobinMode ? games : games.filter((game) => game.vong === vong);
    const anyResult = scope.some((game) => game.denId !== null && game.ket_qua !== 'chua_co');
    if (!input.force || anyResult || vong !== current || (roundRobinMode && vong !== 1)) {
      throw new TournamentError(409, `Vòng ${vong} đã được xếp cặp${anyResult ? ' và đã có kết quả' : ''}`);
    }
    for (const game of scope) {
      await store.deleteGame(game.id);
    }
    games = games.filter((game) => !scope.includes(game));
  } else if (vong !== current + 1) {
    throw new TournamentError(409, `Phải xếp vòng ${current + 1} (vòng tiếp theo)`);
  }
  if (vong > 1 && games.some((game) => game.vong === vong - 1 && game.denId !== null && game.ket_qua === 'chua_co')) {
    throw new TournamentError(409, `Vòng ${vong - 1} còn ván chưa có kết quả`);
  }

  await assignSeeds(store, confirmed);
  const created: Game[] = [];
  const warnings: string[] = [];
  if (roundRobinMode) {
    let totalRounds = bang.so_vong ?? 0;
    if (!games.length) {
      const seeded = [...confirmed].sort((a, b) => (a.so_xuat_phat as number) - (b.so_xuat_phat as number));
      if (seeded.length > 16) {
        throw new TournamentError(400, 'Vòng tròn tối đa 16 kỳ thủ; dùng thể thức Thuỵ Sĩ');
      }
      const schedule = roundRobin(seeded.map((player) => player.id));
      totalRounds = schedule.length;
      await store.updateBang(bang.id, { so_vong: totalRounds });
      for (const round of schedule) {
        for (const game of round.games) {
          await store.createGame({ bangDauId: bang.id, vong: round.round, ban: game.board, ket_qua: 'chua_co', trangId: game.white, denId: game.black, doi_tay: false });
        }
        if (round.bye !== null) {
          await store.createGame({ bangDauId: bang.id, vong: round.round, ban: round.games.length + 1, ket_qua: 'bye', trangId: round.bye, denId: null, doi_tay: false });
        }
      }
      games = await store.listGames(bang.id);
    }
    if (vong > totalRounds) {
      throw new TournamentError(400, `Bảng chỉ có ${totalRounds} vòng`);
    }
    created.push(...games.filter((game) => game.vong === vong));
  } else {
    const rounds = need(bang.so_vong, 409, 'Bảng chưa khai báo số vòng');
    if (vong > rounds) {
      throw new TournamentError(400, `Bảng chỉ có ${rounds} vòng`);
    }
    const out = pairRound(
      confirmed.map((player) => ({ id: player.id, seed: player.so_xuat_phat as number })),
      games.filter((game) => game.trangId !== null).map((game) => ({ round: game.vong, white: game.trangId as Id, black: game.denId, result: game.ket_qua })),
      vong,
    );
    warnings.push(...out.warnings);
    for (const entry of out.pairs) {
      created.push(await store.createGame({ bangDauId: bang.id, vong, ban: entry.board, ket_qua: 'chua_co', trangId: entry.white, denId: entry.black, doi_tay: false }));
    }
    if (out.bye !== null) {
      created.push(await store.createGame({ bangDauId: bang.id, vong, ban: out.pairs.length + 1, ket_qua: 'bye', trangId: out.bye, denId: null, doi_tay: false }));
    }
  }
  await store.updateBang(bang.id, { vong_hien_tai: vong, trang_thai: 'dang_dau' });
  bang.vong_hien_tai = vong;
  if (giai.trang_thai !== 'dang_dien_ra') {
    await store.updateGiai(giai.id, { trang_thai: 'dang_dien_ra' });
  }
  await writeStandings(store, bang);
  return { vong, van_dau: created.map(gameView), canh_bao: warnings };
}


export async function swap(store: Store, actor: Actor, input: { vanDauId?: Id; vanDauId2?: Id; doiMau?: boolean }) {
  requireReferee(actor);
  const first = need(await store.getGame(need(input.vanDauId, 400, 'Thiếu vanDauId')), 404, 'Không có ván đấu này');
  const { bang } = await loadBang(store, first.bangDauId);
  const editable = (game: Game) => game.ket_qua === 'chua_co' && game.denId !== null;
  if (!editable(first)) {
    throw new TournamentError(409, 'Chỉ đổi được ván chưa có kết quả và không phải bye');
  }
  if (input.vanDauId2 !== undefined && input.vanDauId2 !== null) {
    const second = need(await store.getGame(input.vanDauId2), 404, 'Không có ván đấu thứ hai');
    if (String(second.bangDauId) !== String(first.bangDauId) || second.vong !== first.vong || !editable(second)) {
      throw new TournamentError(409, 'Hai ván phải cùng bảng, cùng vòng, chưa có kết quả');
    }
    if (second.id === first.id) {
      throw new TournamentError(400, 'Hai ván phải khác nhau');
    }
    const games = (await store.listGames(bang.id)).filter((game) => game.vong < first.vong && game.denId !== null);
    const met = (a: Id | null, b: Id | null) => games.some((game) => (String(game.trangId) === String(a) && String(game.denId) === String(b)) || (String(game.trangId) === String(b) && String(game.denId) === String(a)));
    const warnings: string[] = [];
    if (met(first.trangId, second.denId) || met(second.trangId, first.denId)) {
      warnings.push('Đổi cặp này làm hai kỳ thủ gặp lại nhau.');
    }
    await store.updateGame(first.id, { denId: second.denId, doi_tay: true });
    await store.updateGame(second.id, { denId: first.denId, doi_tay: true });
    return { canh_bao: warnings, van_dau: [gameView({ ...first, denId: second.denId, doi_tay: true }), gameView({ ...second, denId: first.denId, doi_tay: true })] };
  }
  if (!input.doiMau) {
    throw new TournamentError(400, 'Cần vanDauId2 (đổi quân Đen giữa hai bàn) hoặc doiMau: true (đổi màu quân)');
  }
  await store.updateGame(first.id, { trangId: first.denId, denId: first.trangId, doi_tay: true });
  return { canh_bao: [], van_dau: [gameView({ ...first, trangId: first.denId, denId: first.trangId, doi_tay: true })] };
}

export async function result(store: Store, actor: Actor, input: { vanDauId?: Id; ketQua?: string }) {
  requireReferee(actor);
  const game = need(await store.getGame(need(input.vanDauId, 400, 'Thiếu vanDauId')), 404, 'Không có ván đấu này');
  const ketQua = need(input.ketQua, 400, 'Thiếu ketQua');
  if (!RESULTS.includes(ketQua)) {
    throw new TournamentError(400, `ketQua phải là một trong: ${RESULTS.join(', ')}`);
  }
  if (game.denId === null) {
    throw new TournamentError(409, 'Ván bye không nhập kết quả');
  }
  const { bang, giai } = await loadBang(store, game.bangDauId);
  if (giai.trang_thai !== 'dang_dien_ra') {
    throw new TournamentError(409, 'Giải không ở trạng thái đang diễn ra');
  }
  if (game.vong > bang.vong_hien_tai) {
    throw new TournamentError(409, 'Vòng này chưa được công bố');
  }
  await store.updateGame(game.id, { ket_qua: ketQua });
  const rows = await writeStandings(store, bang);
  return { van_dau: gameView({ ...game, ket_qua: ketQua }), xep_hang: rows.map((row) => ({ id: row.id, hang: row.rank, diem: row.points })) };
}
