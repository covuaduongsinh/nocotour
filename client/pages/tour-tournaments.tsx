import type { ReactElement } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { Trophy, Calendar, MapPin, Users, Plus, ChevronRight, RefreshCw } from 'lucide-react';

export default function TourTournaments(): ReactElement {
  const [tournaments, setTournaments] = useState<any[]>([
    {
      id: 'tour-winter-2026',
      name: 'Giải Vô Địch Cờ Vua Trẻ Dương Sinh Mùa Đông 2026',
      slug: 'duong-sinh-winter-cup-2026',
      status: 'in_progress',
      format: 'Hệ Thụy Sĩ FIDE Dutch',
      startDate: '2026-11-15',
      endDate: '2026-11-16',
      location: '31 ngõ 159 Pháo Đài Láng, Đống Đa, Hà Nội',
      divisionsCount: 2,
      playersCount: 10,
      entryFee: 250000,
    },
    {
      id: 'tour-club-open-2026',
      name: 'Giải Cờ Vua Giao Hữu CLB Mở Rộng Cup Kỳ Vương Nhí',
      slug: 'ky-vuong-nhi-open-2026',
      status: 'registration',
      format: 'Hệ Thụy Sĩ FIDE Dutch',
      startDate: '2026-12-05',
      endDate: '2026-12-06',
      location: 'Trung tâm VHTT Đống Đa, Hà Nội',
      divisionsCount: 1,
      playersCount: 0,
      entryFee: 300000,
    },
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
    fetch(`${apiBase}/tournaments`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setTournaments(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiBase]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Quản Lý Giải Đấu Cờ Vua</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lập kế hoạch giải đấu, mở các bảng đấu lứa tuổi, quy định thể lệ và điều lệ thi đấu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Tạo Giải Đấu Mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tournaments.map((t) => (
          <div key={t.id} className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:border-purple-300 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    t.status === 'in_progress'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {t.status === 'in_progress' ? 'Đang diễn ra' : 'Đang nhận đăng ký'}
                  </span>
                  <span className="text-xs text-muted-foreground">Mã: {t.id}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {t.startDate} - {t.endDate}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {t.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> {t.format === 'swiss' ? 'Hệ Thụy Sĩ FIDE Dutch' : t.format}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.divisionsCount || (t.divisions ? t.divisions.length : 1)} Bảng • {t.playersCount || 0} Kỳ thủ
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/pairings"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted"
                >
                  Điều hành thi đấu <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
