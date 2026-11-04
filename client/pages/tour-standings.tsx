import type { ReactElement } from 'react';
import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, FileDown, Search } from 'lucide-react';

export default function TourStandings(): ReactElement {
  const [standings, setStandings] = useState<any[]>([
    { rank: 1, name: 'Nguyễn Minh Khang', club: 'DSC Pháo Đài Láng', elo: 1250, points: 1.0, buchholz: 0.0, cut1: 0.0, berger: 0.0, wins: 1 },
    { rank: 2, name: 'Trần Gia Bảo', club: 'DSC Kim Liên', elo: 1210, points: 1.0, buchholz: 0.0, cut1: 0.0, berger: 0.0, wins: 1 },
    { rank: 3, name: 'Lê Bảo Châu', club: 'DSC Pháo Đài Láng', elo: 1180, points: 1.0, buchholz: 0.0, cut1: 0.0, berger: 0.0, wins: 1 },
    { rank: 4, name: 'Hoàng Tuấn Kiệt', club: 'CLB Cờ Vua Hoàn Kiếm', elo: 1120, points: 1.0, buchholz: 0.0, cut1: 0.0, berger: 0.0, wins: 1 },
    { rank: 5, name: 'Phạm Nhật Nam', club: 'DSC Vĩnh Phúc', elo: 1150, points: 0.5, buchholz: 0.5, cut1: 0.0, berger: 0.25, wins: 0 },
    { rank: 6, name: 'Đỗ Quỳnh Chi', club: 'DSC Vĩnh Phúc', elo: 1020, points: 0.5, buchholz: 0.5, cut1: 0.0, berger: 0.25, wins: 0 },
    { rank: 7, name: 'Vũ Đức Trí', club: 'DSC Pháo Đài Láng', elo: 1100, points: 0.0, buchholz: 1.0, cut1: 0.0, berger: 0.0, wins: 0 },
    { rank: 8, name: 'Đặng Tuệ Mẫn', club: 'DSC Kim Liên', elo: 1080, points: 0.0, buchholz: 1.0, cut1: 0.0, berger: 0.0, wins: 0 },
    { rank: 9, name: 'Bùi Hải Đăng', club: 'CLB Cờ Vua Cầu Giấy', elo: 1050, points: 0.0, buchholz: 1.0, cut1: 0.0, berger: 0.0, wins: 0 },
    { rank: 10, name: 'Ngô Đức Thắng', club: 'DSC Pháo Đài Láng', elo: 1000, points: 0.0, buchholz: 1.0, cut1: 0.0, berger: 0.0, wins: 0 },
  ]);

  useEffect(() => {
    fetch('/main/api/tour/divisions/div-u9-winter/standings')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data?.standings) {
          const list = res.data.standings.map((s: any, idx: number) => ({
            rank: idx + 1,
            name: s.name,
            club: 'Dương Sinh Chess',
            elo: s.elo || 1000,
            points: s.score,
            buchholz: s.buchholzTotal || 0,
            cut1: s.buchholzCut1 || 0,
            berger: s.sonnebornBerger || 0,
            wins: s.wins || 0,
          }));
          if (list.length > 0) setStandings(list);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
              Bảng U9 Nam Nữ • Cập nhật sau Vòng 1
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Bảng Xếp Hạng Giải Đấu Trực Tiếp
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xếp hạng theo Điểm số, hệ số phụ Buchholz Tổng, Buchholz Cắt 1, Hệ số Sonneborn-Berger và Số ván thắng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/main/api/tour/divisions/div-u9-winter/export-trf"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4" /> Xuất FIDE TRF
          </a>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="p-4 w-16 text-center">Hạng</th>
                <th className="p-4">Kỳ thủ</th>
                <th className="p-4">Đơn vị / CLB</th>
                <th className="p-4 text-center">Elo Ban Đầu</th>
                <th className="p-4 text-center font-bold text-foreground">Điểm</th>
                <th className="p-4 text-center">Buchholz</th>
                <th className="p-4 text-center">Cắt 1</th>
                <th className="p-4 text-center">Berger</th>
                <th className="p-4 text-center">Số Trận Thắng</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {standings.map((s) => (
                <tr key={s.rank} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-center font-bold">
                    {s.rank === 1 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold">🥇</span>}
                    {s.rank === 2 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold">🥈</span>}
                    {s.rank === 3 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/10 text-amber-900 text-xs font-extrabold">🥉</span>}
                    {s.rank > 3 && <span className="text-muted-foreground text-xs">{s.rank}</span>}
                  </td>
                  <td className="p-4 font-bold text-foreground">
                    {s.name}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {s.club}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {s.elo}
                  </td>
                  <td className="p-4 text-center font-extrabold text-base text-purple-700 dark:text-purple-400">
                    {s.points}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {s.buchholz}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {s.cut1}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {s.berger}
                  </td>
                  <td className="p-4 text-center font-semibold text-foreground">
                    {s.wins}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
