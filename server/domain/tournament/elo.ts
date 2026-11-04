// Elo nội bộ Dương Sinh (T4). Lõi thuần, không phụ thuộc NocoBase hay cơ sở dữ liệu.
// Elo khởi điểm theo cấp (thứ tự 1–6): Tốt 800, Mã 900, Tượng 1000, Xe 1100, Hậu 1200, Vua 1300; chưa có cấp thì 800. K = 40.
// Tính MỘT LẦN khi kết thúc giải, theo Elo ĐẦU giải của mọi người (không cập nhật dần từng ván): thay đổi = K × Σ(điểm ván − kỳ vọng ván), làm tròn xa số 0.
// Chỉ ván đánh trên bàn (không tính bye, không tính thắng / thua do vắng).

export const ELO_K = 40;
export const ELO_DEFAULT = 800;
const LEVEL_START = [800, 900, 1000, 1100, 1200, 1300];

export function initialElo(levelOrder: number | null | undefined): number {
  if (!levelOrder || levelOrder < 1) {
    return ELO_DEFAULT;
  }
  return LEVEL_START[Math.min(levelOrder, LEVEL_START.length) - 1];
}

export function expectedScore(own: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - own) / 400));
}

export type EloGame = { opponentRating: number; score: number };
export type EloEntry = { id: string | number; rating: number; games: EloGame[] };
export type EloChange = { id: string | number; before: number; after: number; change: number; games: number };

const roundAwayFromZero = (value: number) => (value < 0 ? -Math.round(-value) : Math.round(value));

export function computeElo(entries: EloEntry[], k: number = ELO_K): EloChange[] {
  return entries.map((entry) => {
    const raw = entry.games.reduce((sum, game) => sum + (game.score - expectedScore(entry.rating, game.opponentRating)), 0) * k;
    const change = roundAwayFromZero(raw);
    return { id: entry.id, before: entry.rating, after: entry.rating + change, change, games: entry.games.length };
  });
}
