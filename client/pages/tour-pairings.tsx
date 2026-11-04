import type { ReactElement } from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Swords,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Printer,
  ChevronRight,
  Medal,
  Clock,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  ShieldAlert,
  Play,
  Users,
} from 'lucide-react';

interface GameItem {
  id: string;
  divisionId: string;
  roundId: string;
  roundNumber: number;
  board: number;
  whitePlayerId: string;
  white: string;
  whiteClub: string;
  whiteElo: number;
  whiteSeed: number;
  blackPlayerId: string | null;
  black: string;
  blackClub: string;
  blackElo: number;
  blackSeed: number;
  result: string;
  isBye: boolean;
  pgnNotation?: string;
  status: 'done' | 'pending';
}

interface StandingItem {
  rank: number;
  playerId: string;
  name: string;
  club: string;
  elo: number;
  seed: number;
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

export default function TourPairings(): ReactElement {
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('div-u9-winter');
  const [division, setDivision] = useState<DivisionInfo | null>(null);

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [viewRound, setViewRound] = useState<number>(1);
  const [totalRounds, setTotalRounds] = useState<number>(5);

  const [games, setGames] = useState<GameItem[]>([]);
  const [standings, setStandings] = useState<StandingItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string; warnings?: string[] } | null>(null);

  const [showForceConfirm, setShowForceConfirm] = useState<boolean>(false);
  const [forceMessage, setForceMessage] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'pairings' | 'standings' | 'both'>('pairings');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
          // Keep selected if exists, otherwise first
          const found = res.data.find((d: any) => d.id === selectedDivisionId);
          if (!found) {
            setSelectedDivisionId(res.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [apiBase]);

  // 2. Fetch Division Details & Games & Standings
  const loadDivisionData = useCallback(
    async (divId: string, roundToView?: number) => {
      setLoading(true);
      try {
        // Fetch Division info
        const divRes = await fetch(`${apiBase}/divisions/${divId}`);
        const divJson = await divRes.json();
        let curRound = 1;
        let totRounds = 5;

        if (divJson.ok && divJson.data) {
          const d = divJson.data;
          setDivision(d);
          curRound = d.currentRound || 1;
          totRounds = d.totalRounds || 5;
          setCurrentRound(curRound);
          setTotalRounds(totRounds);
        }

        const activeViewRound = roundToView !== undefined ? roundToView : curRound;
        setViewRound(activeViewRound);

        // Fetch Games for activeViewRound
        const gamesRes = await fetch(`${apiBase}/divisions/${divId}/games?round=${activeViewRound}`);
        const gamesJson = await gamesRes.json();
        if (gamesJson.ok && gamesJson.data?.games) {
          setGames(gamesJson.data.games);
        } else {
          setGames([]);
        }

        // Fetch Standings
        const standRes = await fetch(`${apiBase}/divisions/${divId}/standings`);
        const standJson = await standRes.json();
        if (standJson.ok && standJson.data?.standings) {
          setStandings(standJson.data.standings);
        }
      } catch (err: any) {
        setNotice({ type: 'error', message: 'Không thể kết nối API giải đấu: ' + err.message });
      } finally {
        setLoading(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (selectedDivisionId) {
      loadDivisionData(selectedDivisionId);
    }
  }, [selectedDivisionId, loadDivisionData]);

  // 3. Switch View Round
  const handleSelectRound = (r: number) => {
    setViewRound(r);
    loadDivisionData(selectedDivisionId, r);
  };

  // 4. Update Game Result (Optimistic + API)
  const handleUpdateResult = async (gameId: string, res: string) => {
    // Optimistic UI update
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, result: res, status: res !== 'chua_co' ? 'done' : 'pending' } : g))
    );

    try {
      const resp = await fetch(`${apiBase}/games/${gameId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: res }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setNotice({ type: 'error', message: data.error || 'Lỗi lưu kết quả ván đấu' });
      } else {
        if (data.roundCompleted) {
          setNotice({
            type: 'success',
            message: `Tất cả các bàn Vòng ${viewRound} đã có kết quả! Sẵn sàng bốc thăm vòng tiếp theo.`,
          });
        }
        // Refresh live standings
        fetch(`${apiBase}/divisions/${selectedDivisionId}/standings`)
          .then((r) => r.json())
          .then((stJson) => {
            if (stJson.ok && stJson.data?.standings) {
              setStandings(stJson.data.standings);
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Không thể kết nối máy chủ: ' + err.message });
    }
  };

  // 5. Run Swiss Pairing API
  const handlePairNextRound = async (force: boolean = false) => {
    setActionLoading(true);
    setNotice({ type: 'info', message: 'Đang chạy thuật toán bốc thăm Thụy Sĩ FIDE Dutch tối ưu...' });
    setShowForceConfirm(false);

    try {
      const res = await fetch(`${apiBase}/divisions/${selectedDivisionId}/pair-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();

      if (data.ok) {
        const nextR = data.data.roundNumber;
        setNotice({
          type: 'success',
          message: data.message || `Bốc thăm Vòng ${nextR} thành công! (${data.data.pairings.length} bàn đấu)`,
          warnings: data.data.warnings?.length > 0 ? data.data.warnings : undefined,
        });
        // Reload new round
        loadDivisionData(selectedDivisionId, nextR);
      } else {
        if (data.pendingBoards && !force) {
          setForceMessage(data.error);
          setShowForceConfirm(true);
          setNotice(null);
        } else {
          setNotice({ type: 'error', message: data.error || 'Bốc thăm thất bại' });
        }
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Lỗi mạng khi gọi API bốc thăm: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Rollback Round
  const handleRollbackRound = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy bốc thăm Vòng ${currentRound} và quay lại Vòng ${currentRound - 1}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${apiBase}/divisions/${selectedDivisionId}/rollback-round`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setNotice({ type: 'success', message: data.message });
        loadDivisionData(selectedDivisionId, data.currentRound);
      } else {
        setNotice({ type: 'error', message: data.error });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: 'Lỗi kết nối khi hủy bốc thăm: ' + err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Filtered Games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (filterStatus === 'pending' && g.status !== 'pending') return false;
      if (filterStatus === 'done' && g.status !== 'done') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchWhite = g.white.toLowerCase().includes(q) || g.whiteClub.toLowerCase().includes(q);
        const matchBlack = g.black.toLowerCase().includes(q) || g.blackClub.toLowerCase().includes(q);
        const matchBoard = String(g.board) === q;
        if (!matchWhite && !matchBlack && !matchBoard) return false;
      }
      return true;
    });
  }, [games, filterStatus, searchQuery]);

  // Statistics for current round view
  const stats = useMemo(() => {
    const total = games.length;
    const completed = games.filter((g) => g.result && g.result !== 'chua_co').length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percent };
  }, [games]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Print header (visible only during window.print) */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-xl font-bold">DƯƠNG SINH CHESS - BIỂU MẪU THI ĐẤU & BỐC THĂM</h1>
        <p className="text-sm">
          {division?.name} • Vòng {viewRound} / {totalRounds} • Hệ Thụy Sĩ FIDE Dutch
        </p>
      </div>

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white shadow-md print:hidden">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-700/60 backdrop-blur-sm text-xs font-semibold text-purple-200 border border-purple-500/30">
              <Swords className="w-3.5 h-3.5 text-amber-300" />
              Bàn Trọng Tài & Điều Hành FIDE Dutch
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              ● Trực Tiếp (Live API)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Điều Hành Giải Đấu: {division?.name || 'Bảng U9 Nam Nữ'}
          </h1>
          <p className="text-xs sm:text-sm text-purple-200">
            Hệ Thụy Sĩ {totalRounds} ván • Nhập tỷ số 1-click • Tự động tính hệ số phụ Buchholz / Berger theo thời gian thực.
          </p>
        </div>

        {/* Division Selector & Action Buttons */}
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

          <button
            onClick={() => handlePairNextRound(false)}
            disabled={actionLoading || currentRound >= totalRounds}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
              currentRound >= totalRounds
                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                : 'bg-amber-400 text-purple-950 hover:bg-amber-300 hover:shadow-lg active:scale-95'
            }`}
            title="Chạy thuật toán bốc thăm FIDE Dutch Swiss cho vòng kế tiếp"
          >
            {actionLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            Bốc Thăm Vòng {Math.min(currentRound + 1, totalRounds)}
          </button>

          <a
            href={`${apiBase}/divisions/${selectedDivisionId}/export-trf`}
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors"
          >
            <FileText className="w-4 h-4 text-purple-300" />
            Xuất FIDE TRF
          </a>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-colors"
            title="In sơ đồ bàn đấu dán bảng tin"
          >
            <Printer className="w-4 h-4 text-purple-300" />
            In Sơ Đồ
          </button>

          <button
            onClick={() => loadDivisionData(selectedDivisionId, viewRound)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Force Pairing Confirmation Modal */}
      {showForceConfirm && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Cảnh Báo Chưa Hoàn Tất Tỷ Số Vòng {currentRound}</div>
              <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">{forceMessage}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowForceConfirm(false)}
              className="px-3 py-1.5 rounded-lg border bg-white dark:bg-gray-800 text-xs font-medium hover:bg-gray-50"
            >
              Hủy & Nhập Tiếp
            </button>
            <button
              onClick={() => handlePairNextRound(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-sm"
            >
              Vẫn Bốc Thăm (Cưỡng Bức)
            </button>
          </div>
        </div>
      )}

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
              : notice.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              : 'bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {notice.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {notice.type === 'info' && <RefreshCw className="w-5 h-5 text-purple-600 shrink-0 mt-0.5 animate-spin" />}
            <div>
              <div className="font-semibold">{notice.message}</div>
              {notice.warnings && notice.warnings.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-xs space-y-0.5 opacity-90">
                  {notice.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs opacity-60 hover:opacity-100 font-semibold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Round Switcher Tabs & Progress Card */}
      <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-muted-foreground uppercase mr-1">Vòng đấu:</span>
            {Array.from({ length: Math.max(currentRound, 1) }).map((_, idx) => {
              const r = idx + 1;
              const isSelected = r === viewRound;
              const isCurrent = r === currentRound;
              return (
                <button
                  key={r}
                  onClick={() => handleSelectRound(r)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  Vòng {r}
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {viewRound === currentRound && currentRound > 1 && stats.completed === 0 && (
              <button
                onClick={handleRollbackRound}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                title="Hủy bốc thăm vòng hiện tại khi chưa có kết quả nào"
              >
                <RotateCcw className="w-3 h-3" /> Hủy Vòng {currentRound}
              </button>
            )}

            <div className="inline-flex rounded-lg border p-0.5 bg-muted/40 text-xs">
              <button
                onClick={() => setActiveTab('pairings')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeTab === 'pairings' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                Bàn Đấu ({games.length})
              </button>
              <button
                onClick={() => setActiveTab('standings')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === 'standings' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Medal className="w-3.5 h-3.5 text-purple-600" />
                BXH Trực Tiếp
              </button>
              <button
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors hidden md:block ${
                  activeTab === 'both' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
                }`}
              >
                Xem Song Song
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar of Current View Round */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              Tiến độ Vòng {viewRound}: {stats.completed}/{stats.total} bàn đã có kết quả
            </span>
            <span className="font-bold text-foreground">
              {stats.percent}% {stats.percent === 100 ? '• Đã Hoàn Thành ✅' : '• Đang Đấu'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                stats.percent === 100 ? 'bg-emerald-500' : 'bg-purple-600'
              }`}
              style={{ width: `${stats.percent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`grid gap-6 ${
          activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
        }`}
      >
        {/* Left / Center: Boards Table */}
        {(activeTab === 'pairings' || activeTab === 'both') && (
          <div
            className={`space-y-4 ${
              activeTab === 'both' ? 'lg:col-span-7' : 'w-full'
            }`}
          >
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kỳ thủ, CLB, số bàn..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium mr-1">Lọc:</span>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    filterStatus === 'all' ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-300' : 'hover:bg-muted'
                  }`}
                >
                  Tất cả ({games.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    filterStatus === 'pending' ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300' : 'hover:bg-muted'
                  }`}
                >
                  Chưa xong ({stats.pending})
                </button>
                <button
                  onClick={() => setFilterStatus('done')}
                  className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    filterStatus === 'done' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' : 'hover:bg-muted'
                  }`}
                >
                  Đã xong ({stats.completed})
                </button>
              </div>
            </div>

            {/* Boards Table */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-3.5 border-b bg-muted/40 flex items-center justify-between">
                <div className="font-bold text-sm flex items-center gap-2">
                  <Swords className="w-4 h-4 text-purple-600" />
                  Sơ Đồ Bàn Thi Đấu Vòng {viewRound}
                </div>
                <div className="text-xs text-muted-foreground">
                  Tổng {filteredGames.length} bàn thi đấu
                </div>
              </div>

              {filteredGames.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  {games.length === 0
                    ? `Vòng ${viewRound} chưa được bốc thăm. Bấm "Bốc Thăm Vòng Tiếp Theo" ở trên để khởi tạo.`
                    : 'Không tìm thấy bàn đấu phù hợp với bộ lọc.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                        <th className="p-3 w-14 text-center">Bàn</th>
                        <th className="p-3">Kỳ thủ Trắng (White)</th>
                        <th className="p-3 text-center w-28">Tỷ Số</th>
                        <th className="p-3">Kỳ thủ Đen (Black)</th>
                        <th className="p-3 text-center print:hidden">Trọng Tài Ghi Điểm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredGames.map((g) => {
                        const isBye = g.isBye;
                        return (
                          <tr
                            key={g.id}
                            className={`hover:bg-muted/30 transition-colors ${
                              g.status === 'done' ? 'bg-muted/10' : ''
                            }`}
                          >
                            {/* Board Number */}
                            <td className="p-3 text-center font-bold text-foreground bg-muted/20">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-card border shadow-2xs font-extrabold text-xs">
                                {g.board}
                              </span>
                            </td>

                            {/* White Player */}
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="w-4 h-4 rounded-full border-2 border-gray-400 bg-white shadow-xs shrink-0"
                                  title="Quân Trắng"
                                ></span>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    {g.white}
                                    <span className="text-2xs px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono">
                                      #{g.whiteSeed}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <span>{g.whiteClub}</span>
                                    <span>•</span>
                                    <span className="font-mono text-purple-700 dark:text-purple-400 font-semibold">
                                      {g.whiteElo} Elo
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Result Display Badge */}
                            <td className="p-3 text-center">
                              {isBye ? (
                                <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                  1 - BYE
                                </span>
                              ) : (
                                <span
                                  className={`inline-block px-3 py-1 rounded-md text-xs font-extrabold tracking-wider border shadow-2xs ${
                                    g.result === '1-0'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                      : g.result === '0-1'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                      : g.result === '1/2'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                      : g.result === '+-'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : g.result === '-+'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-muted/60 text-muted-foreground border-dashed border-gray-300'
                                  }`}
                                >
                                  {g.result === '1/2'
                                    ? '½ - ½'
                                    : g.result === 'chua_co'
                                    ? 'Chưa đấu'
                                    : g.result}
                                </span>
                              )}
                            </td>

                            {/* Black Player */}
                            <td className="p-3">
                              {isBye ? (
                                <div className="text-xs text-purple-700 dark:text-purple-300 italic font-medium">
                                  {g.black}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className="w-4 h-4 rounded-full bg-gray-900 border-2 border-gray-700 shadow-xs shrink-0"
                                    title="Quân Đen"
                                  ></span>
                                  <div>
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                      {g.black}
                                      <span className="text-2xs px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono">
                                        #{g.blackSeed}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                      <span>{g.blackClub}</span>
                                      <span>•</span>
                                      <span className="font-mono text-purple-700 dark:text-purple-400 font-semibold">
                                        {g.blackElo} Elo
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Arbiter Quick Buttons */}
                            <td className="p-3 text-center print:hidden">
                              {isBye ? (
                                <span className="text-xs text-muted-foreground italic">Miễn đấu</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleUpdateResult(g.id, '1-0')}
                                    className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${
                                      g.result === '1-0'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                        : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                    }`}
                                    title="Trắng thắng (1-0)"
                                  >
                                    1 - 0
                                  </button>
                                  <button
                                    onClick={() => handleUpdateResult(g.id, '1/2')}
                                    className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${
                                      g.result === '1/2'
                                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                        : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                    }`}
                                    title="Hòa (½ - ½)"
                                  >
                                    ½ - ½
                                  </button>
                                  <button
                                    onClick={() => handleUpdateResult(g.id, '0-1')}
                                    className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${
                                      g.result === '0-1'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                        : 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300'
                                    }`}
                                    title="Đen thắng (0-1)"
                                  >
                                    0 - 1
                                  </button>
                                  <button
                                    onClick={() => handleUpdateResult(g.id, '+-')}
                                    className={`px-1.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                      g.result === '+-'
                                        ? 'bg-emerald-800 text-white border-emerald-800'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="Trắng thắng do đối thủ vắng (+-)"
                                  >
                                    +-
                                  </button>
                                  <button
                                    onClick={() => handleUpdateResult(g.id, '-+')}
                                    className={`px-1.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                                      g.result === '-+'
                                        ? 'bg-blue-800 text-white border-blue-800'
                                        : 'text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="Đen thắng do đối thủ vắng (-+)"
                                  >
                                    -+
                                  </button>
                                  {g.result !== 'chua_co' && (
                                    <button
                                      onClick={() => handleUpdateResult(g.id, 'chua_co')}
                                      className="p-1 rounded-md text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                                      title="Reset về chưa có kết quả"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right / Center: Live Standings Table */}
        {(activeTab === 'standings' || activeTab === 'both') && (
          <div
            className={`space-y-4 ${
              activeTab === 'both' ? 'lg:col-span-5' : 'w-full'
            }`}
          >
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-3.5 border-b bg-muted/40 flex items-center justify-between">
                <div className="font-bold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Bảng Xếp Hạng Trực Tiếp (Live)
                </div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Tự động cập nhật
                </div>
              </div>

              {standings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Chưa có dữ liệu bảng xếp hạng.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider text-2xs">
                        <th className="p-2.5 text-center w-10">Hạng</th>
                        <th className="p-2.5">Kỳ thủ</th>
                        <th className="p-2.5 text-center font-bold text-foreground">Điểm</th>
                        <th className="p-2.5 text-center">Buchholz</th>
                        <th className="p-2.5 text-center">Cắt 1</th>
                        <th className="p-2.5 text-center">Berger</th>
                        <th className="p-2.5 text-center">Thắng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {standings.map((s) => (
                        <tr key={s.playerId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 text-center font-bold">
                            {s.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
                                🥇
                              </span>
                            ) : s.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold">
                                🥈
                              </span>
                            ) : s.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700/10 text-amber-900 text-xs font-extrabold">
                                🥉
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-semibold">{s.rank}</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-foreground">{s.name}</div>
                            <div className="text-2xs text-muted-foreground">{s.club} • {s.elo} Elo</div>
                          </td>
                          <td className="p-2.5 text-center font-extrabold text-sm text-purple-700 dark:text-purple-400">
                            {s.points}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground font-mono">
                            {s.buchholz}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground font-mono">
                            {s.cut1}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground font-mono">
                            {s.berger}
                          </td>
                          <td className="p-2.5 text-center font-semibold text-foreground">
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
        )}
      </div>
    </div>
  );
}
