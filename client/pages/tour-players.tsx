import type { ReactElement } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Award, Phone, RefreshCw } from 'lucide-react';

export default function TourPlayers(): ReactElement {
  const [players, setPlayers] = useState<any[]>([
    { id: 'p-u9-01', seedNumber: 1, fullName: 'Nguyễn Minh Khang', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', startingElo: 1250, phone: '0912345601', status: 'active', paidFee: 250000 },
    { id: 'p-u9-02', seedNumber: 2, fullName: 'Trần Gia Bảo', birthYear: 2017, gender: 'M', club: 'DSC Kim Liên', startingElo: 1210, phone: '0912345602', status: 'active', paidFee: 250000 },
    { id: 'p-u9-03', seedNumber: 3, fullName: 'Lê Bảo Châu', birthYear: 2018, gender: 'F', club: 'DSC Pháo Đài Láng', startingElo: 1180, phone: '0912345603', status: 'active', paidFee: 250000 },
    { id: 'p-u9-04', seedNumber: 4, fullName: 'Phạm Nhật Nam', birthYear: 2017, gender: 'M', club: 'DSC Vĩnh Phúc', startingElo: 1150, phone: '0912345604', status: 'active', paidFee: 250000 },
    { id: 'p-u9-05', seedNumber: 5, fullName: 'Hoàng Tuấn Kiệt', birthYear: 2018, gender: 'M', club: 'CLB Cờ Vua Hoàn Kiếm', startingElo: 1120, phone: '0912345605', status: 'active', paidFee: 250000 },
    { id: 'p-u9-06', seedNumber: 6, fullName: 'Vũ Đức Trí', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', startingElo: 1100, phone: '0912345606', status: 'active', paidFee: 250000 },
    { id: 'p-u9-07', seedNumber: 7, fullName: 'Đặng Tuệ Mẫn', birthYear: 2018, gender: 'F', club: 'DSC Kim Liên', startingElo: 1080, phone: '0912345607', status: 'active', paidFee: 250000 },
    { id: 'p-u9-08', seedNumber: 8, fullName: 'Bùi Hải Đăng', birthYear: 2017, gender: 'M', club: 'CLB Cờ Vua Cầu Giấy', startingElo: 1050, phone: '0912345608', status: 'active', paidFee: 250000 },
    { id: 'p-u9-09', seedNumber: 9, fullName: 'Đỗ Quỳnh Chi', birthYear: 2018, gender: 'F', club: 'DSC Vĩnh Phúc', startingElo: 1020, phone: '0912345609', status: 'active', paidFee: 250000 },
    { id: 'p-u9-10', seedNumber: 10, fullName: 'Ngô Đức Thắng', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', startingElo: 1000, phone: '0912345610', status: 'active', paidFee: 250000 },
  ]);
  const [loading, setLoading] = useState(false);

  const apiBase = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/main')) {
      return '/main/api/tour';
    }
    return '/api/tour';
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiBase}/players`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setPlayers(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

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
                    {p.seedNumber || p.seed}
                  </td>
                  <td className="p-4 font-semibold text-foreground">
                    {p.fullName || p.name}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {p.birthYear || p.birth}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {p.gender === 'F' ? 'Nữ' : 'Nam'}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {p.club}
                  </td>
                  <td className="p-4 text-center font-bold text-purple-700 dark:text-purple-400">
                    {p.startingElo || p.elo}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                      {p.paidFee > 0 ? 'Đã nộp' : 'Chưa nộp'}
                    </span>
                  </td>
                  <td className="p-4 text-center text-xs text-muted-foreground">
                    {p.status === 'active' ? 'Đang đấu' : p.status}
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
