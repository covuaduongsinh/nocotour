// Bộ xếp cặp hệ Thuỵ Sĩ (giản lược theo tinh thần FIDE Dutch). Lõi thuần: không phụ thuộc NocoBase hay cơ sở dữ liệu.
//
// Quy tắc (theo thứ tự ưu tiên, nới dần khi không có cách xếp nào thoả — mỗi lần nới ghi một cảnh báo):
//   1. Mỗi kỳ thủ còn thi đấu xuất hiện đúng một lần mỗi vòng; số lẻ thì có đúng một bye (1 điểm).
//   2. Không ai nhận bye lần hai khi còn người chưa từng được bye; bye cho người ĐIỂM THẤP NHẤT (rồi hạt giống thấp nhất) chưa từng được bye.
//   3. Không gặp lại (mức 0, 1). Mức 2 mới cho gặp lại, kèm cảnh báo.
//   4. Màu: không ai cầm cùng một màu 3 ván liên tiếp, chênh lệch (trắng − đen) trong khoảng [-2, 2] (mức 0). Mức 1 nới quy tắc màu, kèm cảnh báo.
//   5. Nhóm điểm: nửa trên gặp nửa dưới (1 gặp h+1, 2 gặp h+2, ...), người dư xuống nhóm dưới; vòng 1 xếp theo số xuất phát (hạt giống).
// Bye và ván bỏ cuộc không tính vào lịch sử màu; ván bỏ cuộc vẫn tính là "đã gặp".

export type Id = number | string;
export type SwissPlayer = { id: Id; seed: number };
export type PlayedGame = { round: number; white: Id; black: Id | null; result: string };
export type Pairing = { white: Id; black: Id; board: number };
export type PairResult = { pairs: Pairing[]; bye: Id | null; warnings: string[] };

const WHITE_POINTS: Record<string, number> = { '1-0': 1, '0-1': 0, '1/2': 0.5, '+-': 1, '-+': 0, '--': 0, bye: 1 };
const BLACK_POINTS: Record<string, number> = { '1-0': 0, '0-1': 1, '1/2': 0.5, '+-': 0, '-+': 1, '--': 0 };
const FORFEITS = new Set(['+-', '-+', '--']);

type Info = {
  id: Id;
  seed: number;
  score: number;
  opponents: Set<string>;
  colors: Array<'w' | 'b'>;
  hadBye: boolean;
  diff: number;
};

const key = (id: Id) => String(id);

function buildInfo(players: SwissPlayer[], games: PlayedGame[]): Map<string, Info> {
  const info = new Map<string, Info>();
  for (const player of players) {
    info.set(key(player.id), { id: player.id, seed: player.seed, score: 0, opponents: new Set(), colors: [], hadBye: false, diff: 0 });
  }
  const ordered = [...games].sort((a, b) => a.round - b.round);
  for (const game of ordered) {
    if (game.result === 'chua_co') {
      continue;
    }
    const white = info.get(key(game.white));
    if (white) {
      white.score += WHITE_POINTS[game.result] ?? 0;
    }
    if (game.black === null) {
      if (white) {
        white.hadBye = true;
      }
      continue;
    }
    const black = info.get(key(game.black));
    if (black) {
      black.score += BLACK_POINTS[game.result] ?? 0;
    }
    if (white) {
      white.opponents.add(key(game.black));
    }
    if (black) {
      black.opponents.add(key(game.white));
    }
    if (!FORFEITS.has(game.result)) {
      if (white) {
        white.colors.push('w');
        white.diff += 1;
      }
      if (black) {
        black.colors.push('b');
        black.diff -= 1;
      }
    }
  }
  return info;
}

/** Màu `color` có hợp lệ với kỳ thủ không (không 3 ván liền cùng màu, chênh lệch màu không quá 2)? */
function canTake(player: Info, color: 'w' | 'b'): boolean {
  const n = player.colors.length;
  if (n >= 2 && player.colors[n - 1] === color && player.colors[n - 2] === color) {
    return false;
  }
  const after = player.diff + (color === 'w' ? 1 : -1);
  return Math.abs(after) <= 2;
}

function colorFeasible(a: Info, b: Info): boolean {
  return (canTake(a, 'w') && canTake(b, 'b')) || (canTake(b, 'w') && canTake(a, 'b'));
}

/** a xếp trên b (hạt giống nhỏ hơn / điểm cao hơn). Trả về [trắng, đen]. */
function assignColors(a: Info, b: Info): [Info, Info] {
  const aWhite = canTake(a, 'w') && canTake(b, 'b');
  const bWhite = canTake(b, 'w') && canTake(a, 'b');
  if (aWhite && !bWhite) {
    return [a, b];
  }
  if (bWhite && !aWhite) {
    return [b, a];
  }
  // Cả hai cùng hợp lệ (hoặc cùng không): ai đang thiếu trắng hơn thì được trắng.
  if (a.diff !== b.diff) {
    return a.diff < b.diff ? [a, b] : [b, a];
  }
  // Bằng nhau: người xếp trên đổi màu so với ván gần nhất của mình; chưa có ván nào thì xét người kia; vẫn không có thì người xếp trên cầm trắng.
  const lastA = a.colors[a.colors.length - 1];
  if (lastA) {
    return lastA === 'w' ? [b, a] : [a, b];
  }
  const lastB = b.colors[b.colors.length - 1];
  if (lastB) {
    return lastB === 'w' ? [a, b] : [b, a];
  }
  return [a, b];
}

type Level = 0 | 1 | 2;

function search(list: Info[], level: Level, nodes: { left: number }): Array<[Info, Info]> | null {
  const used = new Array<boolean>(list.length).fill(false);
  const out: Array<[Info, Info]> = [];
  const candidatesOf = (i: number): number[] => {
    const me = list[i];
    const group: number[] = [i];
    const lower: number[] = [];
    for (let j = i + 1; j < list.length; j += 1) {
      if (used[j]) {
        continue;
      }
      if (list[j].score === me.score) {
        group.push(j);
      } else {
        lower.push(j);
      }
    }
    const half = Math.floor(group.length / 2);
    const preferred: number[] = [];
    for (let p = Math.max(half, 1); p < group.length; p += 1) {
      preferred.push(group[p]);
    }
    for (let p = half - 1; p >= 1; p -= 1) {
      preferred.push(group[p]);
    }
    const ordered = [...preferred, ...lower];
    const fresh = ordered.filter((j) => !me.opponents.has(key(list[j].id)));
    if (level === 2) {
      return [...fresh, ...ordered.filter((j) => me.opponents.has(key(list[j].id)))];
    }
    return level === 0 ? fresh.filter((j) => colorFeasible(me, list[j])) : fresh;
  };
  const recurse = (): boolean => {
    const first = used.indexOf(false);
    if (first < 0) {
      return true;
    }
    nodes.left -= 1;
    if (nodes.left < 0) {
      return false;
    }
    used[first] = true;
    for (const j of candidatesOf(first)) {
      used[j] = true;
      out.push([list[first], list[j]]);
      if (recurse()) {
        return true;
      }
      out.pop();
      used[j] = false;
      if (nodes.left < 0) {
        break;
      }
    }
    used[first] = false;
    return false;
  };
  return recurse() ? out : null;
}

export function pairRound(players: SwissPlayer[], games: PlayedGame[], round: number): PairResult {
  const info = buildInfo(players, games);
  const all = [...info.values()].sort((a, b) => b.score - a.score || a.seed - b.seed);
  const warnings: string[] = [];
  if (all.length === 0) {
    return { pairs: [], bye: null, warnings };
  }
  if (all.length === 1) {
    return { pairs: [], bye: all[0].id, warnings };
  }

  const needBye = all.length % 2 === 1;
  // Người nhận bye: điểm thấp nhất rồi hạt giống thấp nhất (cuối bảng), ưu tiên người chưa từng được bye.
  const lowestFirst = [...all].reverse();
  const tiers: Array<Array<Info | null>> = needBye
    ? [lowestFirst.filter((p) => !p.hadBye), lowestFirst.filter((p) => p.hadBye)]
    : [[null]];
  const budget = 30000 + 1500 * all.length;
  for (let t = 0; t < tiers.length; t += 1) {
    for (const level of [0, 1, 2] as Level[]) {
      let tried = 0;
      for (const byePlayer of tiers[t]) {
        if (tried >= 8 && level !== 0) {
          break;
        }
        tried += 1;
        const list = byePlayer ? all.filter((p) => p !== byePlayer) : all;
        const found = search(list, level, { left: budget });
        if (!found) {
          continue;
        }
        if (byePlayer && t === 1) {
          warnings.push(`Vòng ${round}: kỳ thủ ${byePlayer.id} phải nhận bye lần hai (mọi người khác đã được bye).`);
        }
        if (level >= 1) {
          warnings.push(`Vòng ${round}: không tránh được vi phạm quy tắc màu (3 ván liền cùng màu hoặc chênh lệch màu quá 2).`);
        }
        const pairs = found.map(([a, b]) => assignColors(a, b));
        if (level === 2) {
          for (const [white, black] of pairs) {
            if (white.opponents.has(key(black.id))) {
              warnings.push(`Vòng ${round}: buộc phải xếp gặp lại ${white.id} – ${black.id}.`);
            }
          }
        }
        return finalize(pairs, byePlayer, round, warnings);
      }
    }
  }
  throw new Error(`Không xếp được cặp cho vòng ${round}`);
}

function finalize(pairs: Array<[Info, Info]>, byePlayer: Info | null, round: number, warnings: string[]): PairResult {
  const boards = pairs
    .map(([white, black]) => ({ white, black, top: Math.max(white.score, black.score), sum: white.score + black.score, seed: Math.min(white.seed, black.seed) }))
    .sort((x, y) => y.top - x.top || y.sum - x.sum || x.seed - y.seed);
  const result: Pairing[] = boards.map((entry, index) => {
    let { white, black } = entry;
    // Vòng 1: không ai có lịch sử màu; bàn lẻ thì hạt giống cao (số nhỏ) cầm trắng, bàn chẵn cầm đen.
    if (round === 1 && white.colors.length === 0 && black.colors.length === 0) {
      const high = white.seed < black.seed ? white : black;
      const low = high === white ? black : white;
      [white, black] = index % 2 === 0 ? [high, low] : [low, high];
    }
    return { white: white.id, black: black.id, board: index + 1 };
  });
  return { pairs: result, bye: byePlayer ? byePlayer.id : null, warnings };
}
