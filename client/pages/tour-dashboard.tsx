import type { ReactElement } from 'react';
import { useState, useEffect } from 'react';
import { Trophy, Swords, Users, Award, PlayCircle, Sparkles } from 'lucide-react';

export default function TourDashboard(): ReactElement {
  const [data, setData] = useState<any>({
    activeTournaments: 2,
    totalTournaments: 2,
    totalDivisions: 2,
    totalPlayers: 10,
    totalGames: 5,
    completedGames: 5,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/main/api/tour/overview')
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          setData(res.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/50 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider mb-3 border border-purple-400/30">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            Lõi Quản Lý Giải Đấu Cờ Vua FIDE Dutch
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            NocoTour - Dương Sinh Chess Tournaments
          </h1>
          <p className="mt-2 text-purple-200 text-sm leading-relaxed">
            Hệ thống điều hành thi đấu cờ vua chuyên nghiệp: Bốc thăm hệ Thụy Sĩ chuẩn FIDE, Vòng tròn Berger, tính hệ số Buchholz/Berger, quản lý Elo nội bộ và xuất file báo cáo FIDE TRF.
          </p>
        </div>
        <div className="absolute right-6 -bottom-6 opacity-15 text-white pointer-events-none">
          <Trophy className="w-64 h-64" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center dark:bg-purple-950 dark:text-purple-300 font-bold">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Giải đấu đang mở</div>
            <div className="text-2xl font-bold text-foreground">{data.activeTournaments}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Tổng số {data.totalTournaments} giải đấu</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center dark:bg-blue-950 dark:text-blue-300 font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Kỳ thủ tranh tài</div>
            <div className="text-2xl font-bold text-foreground">{data.totalPlayers}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Trong {data.totalDivisions} bảng thi đấu</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center dark:bg-emerald-950 dark:text-emerald-300 font-bold">
            <Swords className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Ván đấu hoàn thành</div>
            <div className="text-2xl font-bold text-foreground">{data.completedGames} / {data.totalGames}</div>
            <div className="text-xs text-emerald-600 font-medium mt-0.5">Tiến độ vòng 1: 100%</div>
          </div>
        </div>

        <div className="p-5 rounded-xl border bg-card text-card-foreground shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-950 dark:text-amber-300 font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Hệ thống bốc thăm</div>
            <div className="text-2xl font-bold text-foreground">FIDE Swiss</div>
            <div className="text-xs text-amber-700 font-medium mt-0.5">Dutch algorithm & Berger</div>
          </div>
        </div>
      </div>

      {/* Featured Tournament Widget */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Đang diễn ra</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mt-1">Giải Vô Địch Cờ Vua Trẻ Dương Sinh Mùa Đông 2026</h2>
            <p className="text-sm text-muted-foreground mt-0.5">31 ngõ 159 Pháo Đài Láng, Đống Đa, Hà Nội • Khởi tranh 15/11/2026</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/pairings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm"
            >
              <Swords className="w-4 h-4" /> Bàn Trọng Tài & Bốc Thăm
            </a>
            <a
              href="/standings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border font-medium text-sm hover:bg-muted transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-600" /> Bảng Xếp Hạng
            </a>
          </div>
        </div>

        {/* Divisions Summary */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-foreground">Bảng U9 Nam Nữ</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
                Đang đấu vòng 1
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Thể thức: <strong>Hệ Thụy Sĩ (Swiss System) 5 ván</strong></div>
              <div>• Số kỳ thủ: <strong>10 kỳ thủ</strong> (Hạt giống số 1: Nguyễn Minh Khang - Elo 1250)</div>
              <div>• Thời gian: 15 phút + 10 giây/nước</div>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Tổ trưởng trọng tài: <strong>Thầy Dương Sinh</strong></span>
              <a href="/pairings" className="text-purple-700 font-semibold hover:underline">Vào chấm điểm →</a>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-foreground">Bảng Mở Rộng Open</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                Đang nhận đăng ký
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Thể thức: <strong>Hệ Thụy Sĩ 5 ván</strong> (Không giới hạn tuổi)</div>
              <div>• Hạn đăng ký: <strong>12/11/2026</strong></div>
              <div>• Lệ phí: 250.000 VNĐ / kỳ thủ (Quét VietQR SePay)</div>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Chế độ: Công bố công khai</span>
              <a href="/players" className="text-blue-700 font-semibold hover:underline">Thêm kỳ thủ →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
