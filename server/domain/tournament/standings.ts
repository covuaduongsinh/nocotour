// Bảng xếp hạng: điểm và các hệ số phụ. Lõi thuần, không phụ thuộc NocoBase hay cơ sở dữ liệu.
//
// Điểm: thắng 1, hoà 0,5, thua 0; thắng do đối thủ vắng (+- / -+) 1; bye 1; cả hai vắng (--) 0.
// Hệ số phụ (thứ tự so sánh): Buchholz cắt 1, Buchholz, Sonneborn-Berger, đối đầu trực tiếp (điểm giữa các kỳ thủ đang bằng nhau), số ván thắng, số xuất phát.
//   - Buchholz = tổng điểm CUỐI của các đối thủ đã gặp. Ván KHÔNG đánh trên bàn (bye, thắng / thua do vắng) dùng "đối thủ ảo" giản lược theo FIDE C.07:
//     điểm đối thủ ảo = điểm kỳ thủ trước vòng đó + (1 − kết quả của mình ở vòng đó) + 0,5 × số vòng còn lại đã có kết quả. (Mức giản lược: không xét ván "chưa xếp cặp".)
//   - Buchholz cắt 1 = Buchholz bỏ đi đối thủ (kể cả ảo) có điểm thấp nhất.
//   - Sonneborn-Berger = Σ điểm đối thủ × kết quả của mình, CHỈ tính ván đánh trên bàn.
//   - Số ván thắng = chỉ thắng trên bàn (không tính bye, không tính thắng do vắng).
// Ván chưa có kết quả ('chua_co') bị bỏ qua.

export type Id = number | string;
export type StandPlayer = { id: Id; seed: number };
export type StandGame = { round: number; white: Id; black: Id | null; result: string };
export type StandRow = { id: Id; points: number; buchholzCut1: number; buchholz: number; sonneborn: number; wins: number; rank: number };

const WHITE_POINTS: Record<string, number> = { '1-0': 1, '0-1': 0, '1/2': 0.5, '+-': 1, '-+': 0, '--': 0, bye: 1 };
const BLACK_POINTS: Record<string, number> = { '1-0': 0, '0-1': 1, '1/2': 0.5, '+-': 0, '-+': 1, '--': 0 };
const OVER_THE_BOARD = new Set(['1-0', '0-1', '1/2']);

type Entry = { round: number; opponent: string | null; points: number; played: boolean; won: boolean };

const key = (id: Id) => String(id);

export function standings(players: StandPlayer[], games: StandGame[]): StandRow[] {
  const entries = new Map<string, Entry[]>();
  for (const player of players) {
    entries.set(key(player.id), []);
  }
  const finished = games.filter((game) => game.result !== 'chua_co' && (WHITE_POINTS[game.result] !== undefined));
  const totalRounds = finished.reduce((max, game) => Math.max(max, game.round), 0);
  for (const game of finished) {
    const board = OVER_THE_BOARD.has(game.result);
    const white = entries.get(key(game.white));
    if (white) {
      white.push({ round: game.round, opponent: game.black === null ? null : key(game.black), points: WHITE_POINTS[game.result], played: board, won: game.result === '1-0' });
    }
    if (game.black !== null) {
      const black = entries.get(key(game.black));
      if (black) {
        black.push({ round: game.round, opponent: key(game.white), points: BLACK_POINTS[game.result] ?? 0, played: board, won: game.result === '0-1' });
      }
    }
  }

  const total = new Map<string, number>();
  for (const [id, list] of entries) {
    total.set(id, list.reduce((sum, entry) => sum + entry.points, 0));
  }

  const rows = players.map((player) => {
    const id = key(player.id);
    const list = [...(entries.get(id) ?? [])].sort((a, b) => a.round - b.round);
    let before = 0;
    const contributions: number[] = [];
    let sonneborn = 0;
    let wins = 0;
    for (const entry of list) {
      if (entry.played && entry.opponent !== null) {
        const opponentTotal = total.get(entry.opponent) ?? 0;
        contributions.push(opponentTotal);
        sonneborn += entry.points * opponentTotal;
      } else {
        contributions.push(before + (1 - entry.points) + 0.5 * (totalRounds - entry.round));
      }
      if (entry.won) {
        wins += 1;
      }
      before += entry.points;
    }
    const buchholz = contributions.reduce((sum, value) => sum + value, 0);
    const lowest = contributions.length ? Math.min(...contributions) : 0;
    return { player, id, points: total.get(id) ?? 0, buchholz, buchholzCut1: contributions.length ? buchholz - lowest : 0, sonneborn, wins };
  });

  rows.sort((a, b) => b.points - a.points || b.buchholzCut1 - a.buchholzCut1 || b.buchholz - a.buchholz || b.sonneborn - a.sonneborn || a.player.seed - b.player.seed);

  // Đối đầu trực tiếp, rồi số ván thắng, rồi số xuất phát: chỉ áp cho các nhóm bằng nhau ở cả bốn tiêu chí đầu.
  const sameKeys = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.points === b.points && a.buchholzCut1 === b.buchholzCut1 && a.buchholz === b.buchholz && a.sonneborn === b.sonneborn;
  const ordered: typeof rows = [];
  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    while (end < rows.length && sameKeys(rows[start], rows[end])) {
      end += 1;
    }
    const group = rows.slice(start, end);
    if (group.length > 1) {
      const members = new Set(group.map((row) => row.id));
      const mutual = new Map<string, number>(group.map((row) => [row.id, 0]));
      for (const game of finished) {
        if (game.black === null || !members.has(key(game.white)) || !members.has(key(game.black))) {
          continue;
        }
        mutual.set(key(game.white), (mutual.get(key(game.white)) ?? 0) + WHITE_POINTS[game.result]);
        mutual.set(key(game.black), (mutual.get(key(game.black)) ?? 0) + (BLACK_POINTS[game.result] ?? 0));
      }
      group.sort((a, b) => (mutual.get(b.id) ?? 0) - (mutual.get(a.id) ?? 0) || b.wins - a.wins || a.player.seed - b.player.seed);
    }
    ordered.push(...group);
    start = end;
  }

  return ordered.map((row, index) => ({
    id: row.player.id,
    points: row.points,
    buchholzCut1: row.buchholzCut1,
    buchholz: row.buchholz,
    sonneborn: row.sonneborn,
    wins: row.wins,
    rank: index + 1,
  }));
}
