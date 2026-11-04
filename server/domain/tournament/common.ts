// Hàm dùng chung của dịch vụ giải đấu (chuyển từ v2 service.ts: vai trò, kiểm tra đầu vào, xếp hạng, ngày VN, làm sạch chuỗi).
import { standings as computeStandings } from './standings.js';
import { TournamentError } from './errors.js';
import type { Actor, Bang, Game, Id, Player, TournamentStore as Store } from './types.js';

export const MANAGER_ROLES = ['root', 'admin', 'dsc_quan_ly'];
export const REFEREE_ROLES = [...MANAGER_ROLES, 'dsc_giao_vien'];
export const VIEW_ROLES = [...REFEREE_ROLES, 'dsc_ke_toan', 'dsc_tu_van'];
export const PARENT_ROLE = 'dsc_phu_huynh';
export const RESULTS = ['chua_co', '1-0', '0-1', '1/2', '+-', '-+', '--'];
export const CONFIRMED = 'da_xac_nhan';

export const hasRole = (actor: Actor | null, roles: string[]) => Boolean(actor && actor.roles.some((role) => roles.includes(role)));
export const isManager = (actor: Actor | null) => hasRole(actor, MANAGER_ROLES);

export function need<T>(value: T | null | undefined, status: number, message: string): T {
  if (value === null || value === undefined || value === ('' as unknown as T)) {
    throw new TournamentError(status, message);
  }
  return value;
}

export function requireReferee(actor: Actor | null) {
  if (!hasRole(actor, REFEREE_ROLES)) {
    throw new TournamentError(403, 'Chỉ quản lý hoặc giáo viên (trọng tài) được làm việc này');
  }
}

export const todayOf = (now: Date) => new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);

export async function loadBang(store: Store, id: unknown) {
  const bang = need(await store.getBang(need(id as Id | undefined, 400, 'Thiếu bangDauId')), 404, 'Không có bảng đấu này');
  const giai = need(await store.getGiai(bang.giaiDauId), 404, 'Bảng đấu chưa thuộc giải nào');
  return { bang, giai };
}

/** Điểm / hạng của một bảng, tính từ các ván của vòng ĐÃ CÔNG BỐ (vòng tròn tạo sẵn mọi vòng, vòng chưa công bố không được tính) của kỳ thủ đã xác nhận. */
export function rankPlayers(players: Player[], games: Game[], publishedRounds: number) {
  const confirmed = players.filter((player) => player.trang_thai === CONFIRMED);
  const seedOf = (player: Player) => player.so_xuat_phat ?? 100000 + Number(player.id);
  return computeStandings(
    confirmed.map((player) => ({ id: player.id, seed: seedOf(player) })),
    games.filter((game) => game.trangId !== null && game.vong <= publishedRounds).map((game) => ({ round: game.vong, white: game.trangId as Id, black: game.denId, result: game.ket_qua })),
  );
}

export async function writeStandings(store: Store, bang: Bang) {
  const players = await store.listPlayers(bang.id);
  const games = await store.listGames(bang.id);
  const rows = rankPlayers(players, games, bang.vong_hien_tai);
  for (const row of rows) {
    await store.updatePlayer(row.id, { diem: row.points, buchholz_cat1: row.buchholzCut1, buchholz: row.buchholz, sonneborn: row.sonneborn, so_thang: row.wins, hang: row.rank });
  }
  return rows;
}

export const gameView = (game: Game) => ({ id: game.id, vong: game.vong, ban: game.ban, ket_qua: game.ket_qua, trang: game.trangId, den: game.denId, doi_tay: game.doi_tay });

export const publicName = (player: Player | undefined, full: boolean) => {
  if (!player) {
    return null;
  }
  return full || player.dong_y_cong_bo ? player.ho_ten : `Kỳ thủ #${player.so_xuat_phat ?? player.id}`;
};

// eslint-disable-next-line @typescript-eslint/no-base-to-string -- giữ đúng cách chuyển chuỗi của v2 cho mọi kiểu đầu vào
export const truthy = (value: unknown) => value === true || ['1', 'true', 'on', 'yes'].includes(String(value ?? '').toLowerCase());
export const clean = (value: unknown, max: number) =>
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- giữ đúng cách chuyển chuỗi của v2 cho mọi kiểu đầu vào
  String(value ?? '')
    // eslint-disable-next-line no-control-regex -- cố ý loại ký tự điều khiển khỏi dữ liệu nhập
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
