import type { ReactElement } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, Medal, Award, FileDown, Search, RefreshCw, Sparkles, Filter } from 'lucide-react';

interface StandingRow {
  rank: number;
  playerId: string;
  name: string;
  club: string;
  elo: number;
  seed: number;
  gender: string;
  birthYear: number;
  points: number;
  buchholz: number;
  cut1: number;
  berger: number;
  wins: number;
}

interface DivisionInfo {
  id: string;
  tournamentId: string;
  name: string;
  pairingSystem: string;
  totalRounds: number;
  currentRound: number;
  status: string;
}

export default function TourStandings(): ReactElement {
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('div-u9-winter');
  const [division, setDivision] = useState<DivisionInfo | null>(null);
  const [tournamentName, setTournamentName] = useState<string>('');

  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const apiBase = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/main')) {
      return '/main/api/tour';
    }
    return '/api/tour';
  }, []);

  // 1. Fetch Divisions List
  useEffect(() => {
    fetch(`${apiBase}/divisions`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setDivisions(res.data);
          const found = res.data.find((d: any) => d.id === selectedDivisionId);
          if (!found) {
            setSelectedDivisionId(res.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [apiBase]);

  // 2. Fetch Standings Data
  const loadStandings = useCallback(
    async (divId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/divisions/${divId}/standings`);
        const json = await res.json();
        if (json.ok && json.data) {
          setDivision(json.data.division);
          setTournamentName(json.data.tournament?.name || 'Giải Vô Địch Cờ Vua Dương Sinh');
          setStandings(json.data.standings || []);
        }
      } catch (err) {
        console.error('Failed to load standings', err);
      } finally {
        setLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (selectedDivisionId) {
      loadStandings(selectedDivisionId);
    }
  }, [selectedDivisionId, loadStandings]);

  // Auto-refresh interval (every 10s if enabled)
  useEffect(() => {
    if (!autoRefresh || !selectedDivisionId) return;
    const interval = setInterval(() => {
      loadStandings(selectedDivisionId);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedDivisionId, loadStandings]);

  // Filtered standings
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return standings;
    const q = searchQuery.toLowerCase();
    return standings.filter(
      (s) => s.name.toLowerCase().includes(q) || s.club.toLowerCase().includes(q)
    );
  }, [standings, searchQuery]);

  // Top 3 for podium
  const top3 = useMemo(() => {
    return standings.slice(0, 3);
  }, [standings]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-700/60 backdrop-blur-sm text-xs font-semibold text-purple-200 border border-purple-500/30">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              Bảng Xếp Hạng FIDE Chuẩn Quốc Tế
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              ● Trực Tiếp (Live Realtime)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {division?.name || 'Bảng U9 Nam Nữ'}
          </h1>
          <p className="text-xs sm:text-sm text-purple-200">
            {tournamentName} • Cập nhật sau Vòng {division?.currentRound || 1} / {division?.totalRounds || 5}
          </p>
        </div>

        {/* Division Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {divisions.length > 1 && (
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-purple-800/80 border border-purple-600/50 text-white text-xs font-medium focus:ring-2 focus:ring-purple-400 outline-none"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id} className="text-gray-900">
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <a
            href={`${apiBase}/divisions/${selectedDivisionId}/export-trf`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <FileDown className="w-4 h-4 text-purple-200" />
            Xuất FIDE TRF
          </a>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              autoRefresh
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
            }`}
            title="Tự động làm mới mỗi 10 giây (dành cho màn hình máy chiếu)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live ON' : 'Tự động tải'}
          </button>

          <button
            onClick={() => loadStandings(selectedDivisionId)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
            title="Làm mới bảng xếp hạng"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank 2 (Silver) */}
          <div className="order-2 md:order-1 p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:border-slate-400 transition-all">
            <div className="absolute top-3 right-3 text-2xl">🥈</div>
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-center text-lg mb-2 shadow-inner">
              2
            </div>
            <div className="font-extrabold text-base text-foreground">{top3[1].name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{top3[1].club}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-lg font-black text-purple-700 dark:text-purple-400">
                {top3[1].points} Điểm
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                (BH: {top3[1].buchholz})
              </span>
            </div>
          </div>

          {/* Rank 1 (Gold) */}
          <div className="order-1 md:order-2 p-6 rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-500/10 via-card to-card shadow-md flex flex-col items-center text-center relative overflow-hidden transform md:-translate-y-2">
            <div className="absolute top-3 right-3 text-3xl">🥇</div>
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 font-black flex items-center justify-center text-xl mb-2 shadow-inner border border-amber-300">
              1
            </div>
            <div className="font-black text-lg text-foreground">{top3[0].name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{top3[0].club}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {top3[0].points} Điểm
              </span>
              <span className="text-xs font-bold text-muted-foreground font-mono">
                (BH: {top3[0].buchholz})
              </span>
            </div>
            <div className="mt-2 text-2xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
              Đang dẫn đầu bảng đấu
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="order-3 p-5 rounded-2xl border bg-card text-card-foreground shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:border-amber-700/40 transition-all">
            <div className="absolute top-3 right-3 text-2xl">🥉</div>
            <div className="w-12 h-12 rounded-full bg-amber-900/10 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center text-lg mb-2 shadow-inner">
              3
            </div>
            <div className="font-extrabold text-base text-foreground">{top3[2].name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{top3[2].club}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-lg font-black text-purple-700 dark:text-purple-400">
                {top3[2].points} Điểm
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                (BH: {top3[2].buchholz})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Standings Table Card */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Search & Meta Bar */}
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm kỳ thủ, CLB..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-3">
            <span>Tiêu chí: <b>Điểm → Buchholz Cut 1 → Buchholz → Sonneborn-Berger → Thắng</b></span>
            <span>•</span>
            <span>Tổng: <b>{standings.length} kỳ thủ</b></span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Không tìm thấy kỳ thủ nào phù hợp với tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="p-3.5 w-16 text-center">Hạng</th>
                  <th className="p-3.5">Kỳ Thủ</th>
                  <th className="p-3.5">Đơn Vị / CLB</th>
                  <th className="p-3.5 text-center">Elo Gốc</th>
                  <th className="p-3.5 text-center font-bold text-foreground">Điểm</th>
                  <th className="p-3.5 text-center">Buchholz</th>
                  <th className="p-3.5 text-center">Cắt 1</th>
                  <th className="p-3.5 text-center">Berger</th>
                  <th className="p-3.5 text-center">Ván Thắng</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => (
                  <tr key={s.playerId} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 text-center font-bold">
                      {s.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-2xs">
                          🥇
                        </span>
                      ) : s.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-black shadow-2xs">
                          🥈
                        </span>
                      ) : s.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/10 text-amber-900 text-xs font-black shadow-2xs">
                          🥉
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-semibold">{s.rank}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-foreground flex items-center gap-1.5">
                        {s.name}
                        <span className="text-2xs px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono">
                          #{s.seed}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.birthYear} • {s.gender === 'F' ? 'Nữ' : 'Nam'}
                      </div>
                    </td>
                    <td className="p-3.5 text-xs text-muted-foreground">
                      {s.club}
                    </td>
                    <td className="p-3.5 text-center text-xs text-muted-foreground font-mono">
                      {s.elo}
                    </td>
                    <td className="p-3.5 text-center font-black text-base text-purple-700 dark:text-purple-400">
                      {s.points}
                    </td>
                    <td className="p-3.5 text-center text-xs text-muted-foreground font-mono">
                      {s.buchholz}
                    </td>
                    <td className="p-3.5 text-center text-xs text-muted-foreground font-mono font-medium">
                      {s.cut1}
                    </td>
                    <td className="p-3.5 text-center text-xs text-muted-foreground font-mono">
                      {s.berger}
                    </td>
                    <td className="p-3.5 text-center font-bold text-xs text-foreground">
                      {s.wins}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
