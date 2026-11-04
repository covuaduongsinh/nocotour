// Vòng tròn theo bảng Berger (phương pháp xoay vòng). Lõi thuần, không phụ thuộc NocoBase hay cơ sở dữ liệu.
// n kỳ thủ (3–16): n chẵn → n-1 vòng, mỗi vòng n/2 ván; n lẻ → thêm một "kỳ thủ ảo" nên n vòng, mỗi vòng một người nghỉ (bye, 1 điểm).
// Màu: ai đang cầm ít trắng hơn thì được trắng; bằng nhau thì xen kẽ theo (số bàn + số vòng) — mỗi kỳ thủ chênh lệch màu không quá 2.

export type Id = number | string;
export type RoundRobinGame = { white: Id; black: Id; board: number };
export type RoundRobinRound = { round: number; games: RoundRobinGame[]; bye: Id | null };

export function roundRobin(ids: Id[]): RoundRobinRound[] {
  if (ids.length < 2) {
    return [];
  }
  const slots: Array<Id | null> = [...ids];
  if (slots.length % 2 === 1) {
    slots.push(null);
  }
  const size = slots.length;
  const rounds: RoundRobinRound[] = [];
  let ring = [...slots];
  const balance = new Map<string, number>(); // trắng − đen đang có của từng kỳ thủ
  for (let r = 0; r < size - 1; r += 1) {
    const games: RoundRobinGame[] = [];
    let bye: Id | null = null;
    let board = 0;
    for (let k = 0; k < size / 2; k += 1) {
      const a = ring[k];
      const b = ring[size - 1 - k];
      if (a === null || b === null) {
        bye = (a === null ? b : a);
        continue;
      }
      board += 1;
      const diffA = balance.get(String(a)) ?? 0;
      const diffB = balance.get(String(b)) ?? 0;
      const aWhite = diffA !== diffB ? diffA < diffB : (k + r) % 2 === 0;
      balance.set(String(a), diffA + (aWhite ? 1 : -1));
      balance.set(String(b), diffB + (aWhite ? -1 : 1));
      games.push(aWhite ? { white: a, black: b, board } : { white: b, black: a, board });
    }
    rounds.push({ round: r + 1, games, bye });
    // Xoay: giữ nguyên vị trí đầu, các vị trí còn lại dịch một bước.
    ring = [ring[0], ring[size - 1], ...ring.slice(1, size - 1)];
  }
  return rounds;
}
