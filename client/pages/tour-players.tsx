import type { ReactElement } from 'react';
import { useState } from 'react';
import { Users, Plus, Award, Phone } from 'lucide-react';

export default function TourPlayers(): ReactElement {
  const [players] = useState([
    { id: 'p-u9-01', seed: 1, name: 'Nguyễn Minh Khang', birth: 2017, gender: 'Nam', club: 'DSC Pháo Đài Láng', elo: 1250, phone: '0912345601', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-02', seed: 2, name: 'Trần Gia Bảo', birth: 2017, gender: 'Nam', club: 'DSC Kim Liên', elo: 1210, phone: '0912345602', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-03', seed: 3, name: 'Lê Bảo Châu', birth: 2018, gender: 'Nữ', club: 'DSC Pháo Đài Láng', elo: 1180, phone: '0912345603', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-04', seed: 4, name: 'Phạm Nhật Nam', birth: 2017, gender: 'Nam', club: 'DSC Vĩnh Phúc', elo: 1150, phone: '0912345604', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-05', seed: 5, name: 'Hoàng Tuấn Kiệt', birth: 2018, gender: 'Nam', club: 'CLB Cờ Vua Hoàn Kiếm', elo: 1120, phone: '0912345605', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-06', seed: 6, name: 'Vũ Đức Trí', birth: 2017, gender: 'Nam', club: 'DSC Pháo Đài Láng', elo: 1100, phone: '0912345606', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-07', seed: 7, name: 'Đặng Tuệ Mẫn', birth: 2018, gender: 'Nữ', club: 'DSC Kim Liên', elo: 1080, phone: '0912345607', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-08', seed: 8, name: 'Bùi Hải Đăng', birth: 2017, gender: 'Nam', club: 'CLB Cờ Vua Cầu Giấy', elo: 1050, phone: '0912345608', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-09', seed: 9, name: 'Đỗ Quỳnh Chi', birth: 2018, gender: 'Nữ', club: 'DSC Vĩnh Phúc', elo: 1020, phone: '0912345609', status: 'Đang đấu', fee: 'Đã nộp' },
    { id: 'p-u9-10', seed: 10, name: 'Ngô Đức Thắng', birth: 2017, gender: 'Nam', club: 'DSC Pháo Đài Láng', elo: 1000, phone: '0912345610', status: 'Đang đấu', fee: 'Đã nộp' },
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Danh Sách Kỳ Thủ Đăng Ký</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý kỳ thủ, số xuất phát (SBN/Seed), Elo xếp hạt giống và trạng thái nộp lệ phí.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Đăng Ký Kỳ Thủ
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="p-4 w-16 text-center">SBN</th>
                <th className="p-4">Họ và Tên</th>
                <th className="p-4 text-center">Năm Sinh</th>
                <th className="p-4 text-center">Giới Tính</th>
                <th className="p-4">Đơn vị / CLB</th>
                <th className="p-4 text-center">Elo Hạt Giống</th>
                <th className="p-4 text-center">Lệ phí</th>
                <th className="p-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-center font-bold text-foreground bg-muted/20">
                    {p.seed}
                  </td>
                  <td className="p-4 font-semibold text-foreground">
                    {p.name}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {p.birth}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {p.gender}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {p.club}
                  </td>
                  <td className="p-4 text-center font-bold text-purple-700 dark:text-purple-400">
                    {p.elo}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      {p.fee}
                    </span>
                  </td>
                  <td className="p-4 text-center text-xs text-muted-foreground">
                    {p.status}
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
