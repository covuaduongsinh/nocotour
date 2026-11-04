// Xuất TRF16 (định dạng chuẩn FIDE để đối chiếu / chạy bằng Swiss-Manager). Lõi thuần, không phụ thuộc NocoBase hay cơ sở dữ liệu.
// Dòng người chơi `001` (số cột tính từ 1): 1-3 "001", 5-8 số xuất phát, 10 giới tính (m/w), 11-13 danh hiệu, 15-47 họ tên (33 ký tự), 49-52 Elo,
// 54-56 liên đoàn, 58-68 mã FIDE (11), 70-79 ngày sinh, 81-84 điểm, 86-89 hạng; từ cột 92 mỗi vòng một khối 10 ký tự: "oooo c r  "
// (oooo = số xuất phát đối thủ, 0000 nếu không có; c = w/b/-; r = 1 thắng, 0 thua, = hoà, + thắng do vắng, - thua do vắng, F bye 1 điểm, U chưa xếp cặp).

export type Id = number | string;
export type TrfPlayer = {
  id: Id;
  seed: number;
  name: string;
  sex?: 'm' | 'w' | null;
  rating?: number | null;
  birthYear?: number | null;
  points: number;
  rank: number;
};
export type TrfGame = { round: number; white: Id; black: Id | null; result: string };
export type TrfHeader = {
  name: string;
  city?: string;
  federation?: string;
  startDate?: string;
  endDate?: string;
  rounds: number;
  type?: string;
  timeControl?: string;
};

const WHITE_CODE: Record<string, string> = { '1-0': '1', '0-1': '0', '1/2': '=', '+-': '+', '-+': '-', '--': '-', bye: 'F' };
const BLACK_CODE: Record<string, string> = { '1-0': '0', '0-1': '1', '1/2': '=', '+-': '-', '-+': '+', '--': '-' };

const clean = (text: string) => text.normalize('NFC').replace(/[\r\n]+/g, ' ');
const fit = (text: string, width: number) => clean(text).slice(0, width).padEnd(width, ' ');
const right = (text: string | number, width: number) => String(text).slice(-width).padStart(width, ' ');

export function trf16(header: TrfHeader, players: TrfPlayer[], games: TrfGame[]): string {
  const sorted = [...players].sort((a, b) => a.seed - b.seed);
  const seedOf = new Map(players.map((player) => [String(player.id), player.seed]));
  const rated = players.filter((player) => player.rating).length;
  const lines = [
    `012 ${clean(header.name)}`,
    `022 ${clean(header.city ?? '')}`,
    `032 ${clean(header.federation ?? 'VIE')}`,
    `042 ${header.startDate ?? ''}`,
    `052 ${header.endDate ?? ''}`,
    `062 ${players.length}`,
    `072 ${rated}`,
    '082 0',
    `092 ${clean(header.type ?? 'Swiss system')}`,
    '102 ',
    '112 ',
    `122 ${clean(header.timeControl ?? '')}`,
    `XXR ${header.rounds}`,
  ];
  for (const player of sorted) {
    let line =
      '001' +
      ' ' +
      right(player.seed, 4) +
      ' ' +
      (player.sex ?? ' ') +
      '   ' +
      ' ' +
      fit(player.name, 33) +
      ' ' +
      right(player.rating ?? 0, 4) +
      ' ' +
      fit('VIE', 3) +
      ' ' +
      right('', 11) +
      ' ' +
      fit(player.birthYear ? `${player.birthYear}/00/00` : '', 10) +
      ' ' +
      right(player.points.toFixed(1), 4) +
      ' ' +
      right(player.rank, 4) +
      '  ';
    for (let round = 1; round <= header.rounds; round += 1) {
      const game = games.find((entry) => entry.round === round && (String(entry.white) === String(player.id) || (entry.black !== null && String(entry.black) === String(player.id))));
      let block = '0000 - U  ';
      if (game && game.result !== 'chua_co') {
        if (String(game.white) === String(player.id)) {
          const opponent = game.black === null ? 0 : (seedOf.get(String(game.black)) ?? 0);
          block = `${right(opponent, 4)} ${game.black === null ? '-' : 'w'} ${WHITE_CODE[game.result] ?? 'U'}  `;
        } else {
          block = `${right(seedOf.get(String(game.white)) ?? 0, 4)} b ${BLACK_CODE[game.result] ?? 'U'}  `;
        }
      }
      line += block;
    }
    lines.push(line.replace(/\s+$/, ''));
  }
  return `${lines.join('\r\n')}\r\n`;
}
