import type { ReactElement } from 'react';
import { useState } from 'react';
import { Award, FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';

export default function TourEloTrf(): ReactElement {
  const [eloList] = useState([
    { name: 'Nguyễn Minh Khang', before: 1250, change: 12, after: 1262, games: 1, k: 20 },
    { name: 'Trần Gia Bảo', before: 1210, change: 14, after: 1224, games: 1, k: 20 },
    { name: 'Lê Bảo Châu', before: 1180, change: 11, after: 1191, games: 1, k: 20 },
    { name: 'Hoàng Tuấn Kiệt', before: 1120, change: 13, after: 1133, games: 1, k: 20 },
    { name: 'Phạm Nhật Nam', before: 1150, change: -2, after: 1148, games: 1, k: 20 },
    { name: 'Đỗ Quỳnh Chi', before: 1020, change: 2, after: 1022, games: 1, k: 20 },
    { name: 'Vũ Đức Trí', before: 1100, change: -12, after: 1088, games: 1, k: 20 },
    { name: 'Đặng Tuệ Mẫn', before: 1080, change: -14, after: 1066, games: 1, k: 20 },
    { name: 'Bùi Hải Đăng', before: 1050, change: -11, after: 1039, games: 1, k: 20 },
    { name: 'Ngô Đức Thắng', before: 1000, change: -13, after: 987, games: 1, k: 20 },
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Biến Động Elo & Xuất File FIDE TRF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tính toán công thức Elo FIDE tiêu chuẩn (R' = R + K*(S-E)) và xuất định dạng TRF16 để gửi báo cáo hoặc đồng bộ Chess-Results.
          </p>
        </div>

        <a
          href="/main/api/tour/divisions/div-u9-winter/export-trf"
          download
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Tải Xuống File .TRF (FIDE Standard)
        </a>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <span className="font-semibold text-sm">Bảng Tính Elo Vòng 1 (Hệ số K = 20)</span>
          <span className="text-xs text-muted-foreground">Tự động đồng bộ sang hồ sơ học viên NocoEdu</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Kỳ thủ</th>
                <th className="p-4 text-center">Elo Trước Giải</th>
                <th className="p-4 text-center">Biến Động</th>
                <th className="p-4 text-center">Elo Hiện Tại</th>
                <th className="p-4 text-center">Số Ván Đấu</th>
                <th className="p-4 text-center">Hệ số K</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {eloList.map((e, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-semibold text-foreground">
                    {e.name}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {e.before}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      e.change > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : e.change < 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {e.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {e.change > 0 ? `+${e.change}` : e.change}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-foreground">
                    {e.after}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {e.games}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {e.k}
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
