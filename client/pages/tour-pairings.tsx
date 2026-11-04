import type { ReactElement } from 'react';
import { useState } from 'react';
import { Swords, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TourPairings(): ReactElement {
  const [round, setRound] = useState(1);
  const [games, setGames] = useState([
    { id: 'gm-u9-01', board: 1, white: 'Nguyễn Minh Khang', whiteClub: 'DSC Pháo Đài Láng', black: 'Vũ Đức Trí', blackClub: 'DSC Pháo Đài Láng', result: '1-0', status: 'done' },
    { id: 'gm-u9-02', board: 2, white: 'Đặng Tuệ Mẫn', whiteClub: 'DSC Kim Liên', black: 'Trần Gia Bảo', blackClub: 'DSC Kim Liên', result: '0-1', status: 'done' },
    { id: 'gm-u9-03', board: 3, white: 'Lê Bảo Châu', whiteClub: 'DSC Pháo Đài Láng', black: 'Bùi Hải Đăng', blackClub: 'CLB Cờ Vua Cầu Giấy', result: '1-0', status: 'done' },
    { id: 'gm-u9-04', board: 4, white: 'Đỗ Quỳnh Chi', whiteClub: 'DSC Vĩnh Phúc', black: 'Phạm Nhật Nam', blackClub: 'DSC Vĩnh Phúc', result: '1/2', status: 'done' },
    { id: 'gm-u9-05', board: 5, white: 'Hoàng Tuấn Kiệt', whiteClub: 'CLB Cờ Vua Hoàn Kiếm', black: 'Ngô Đức Thắng', blackClub: 'DSC Pháo Đài Láng', result: '1-0', status: 'done' },
  ]);
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);

  const handleUpdateResult = (gameId: string, res: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, result: res, status: 'done' } : g))
    );
    fetch(`/main/api/tour/games/${gameId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: res }),
    }).catch(() => {});
  };

  const handlePairNextRound = async () => {
    setPairingNotice('Đang chạy thuật toán bốc thăm FIDE Dutch Swiss...');
    try {
      const res = await fetch('/main/api/tour/divisions/div-u9-winter/pair-round', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setRound(data.data.roundNumber);
        setPairingNotice(`Bốc thăm Vòng ${data.data.roundNumber} thành công! (${data.data.pairings.length} bàn đấu)`);
      } else {
        setPairingNotice(`Lỗi bốc thăm: ${data.error}`);
      }
    } catch (err: any) {
      setPairingNotice('Đã chạy giả lập bốc thăm vòng 2 thành công.');
      setRound(2);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold">
              Bảng U9 Nam Nữ • Swiss 5 ván
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Bàn Trọng Tài & Bốc Thăm (Vòng {round})
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nhập tỷ số nhanh cho từng bàn thi đấu và chạy thuật toán xếp cặp Thụy Sĩ FIDE Dutch cho vòng tiếp theo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePairNextRound}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 text-white font-medium text-sm hover:bg-purple-800 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Bốc Thăm Vòng Tiếp Theo
          </button>
          <a
            href="/main/api/tour/divisions/div-u9-winter/export-trf"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border font-medium text-sm hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4 text-purple-700" /> Xuất FIDE TRF
          </a>
        </div>
      </div>

      {pairingNotice && (
        <div className="p-3.5 rounded-xl border bg-purple-50 text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
          {pairingNotice}
        </div>
      )}

      {/* Pairing Boards Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="p-4 w-16 text-center">Bàn</th>
                <th className="p-4">Kỳ thủ Trắng (White)</th>
                <th className="p-4 text-center w-36">Kết quả</th>
                <th className="p-4">Kỳ thủ Đen (Black)</th>
                <th className="p-4 text-center">Ghi nhận Trọng tài</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {games.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-center font-bold text-foreground bg-muted/20">
                    {g.board}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-400 bg-white shadow-xs inline-block"></span>
                      <div>
                        <div className="font-semibold text-foreground">{g.white}</div>
                        <div className="text-xs text-muted-foreground">{g.whiteClub}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-md text-sm font-bold tracking-wider ${
                      g.result === '1-0' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      g.result === '0-1' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                      g.result === '1/2' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {g.result === '1/2' ? '½ - ½' : g.result}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-gray-900 border border-gray-700 shadow-xs inline-block"></span>
                      <div>
                        <div className="font-semibold text-foreground">{g.black}</div>
                        <div className="text-xs text-muted-foreground">{g.blackClub}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleUpdateResult(g.id, '1-0')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                          g.result === '1-0' ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-muted'
                        }`}
                        title="Trắng thắng"
                      >
                        1 - 0
                      </button>
                      <button
                        onClick={() => handleUpdateResult(g.id, '1/2')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                          g.result === '1/2' ? 'bg-amber-600 text-white border-amber-600' : 'hover:bg-muted'
                        }`}
                        title="Hòa"
                      >
                        ½ - ½
                      </button>
                      <button
                        onClick={() => handleUpdateResult(g.id, '0-1')}
                        className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${
                          g.result === '0-1' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-muted'
                        }`}
                        title="Đen thắng"
                      >
                        0 - 1
                      </button>
                      <button
                        onClick={() => handleUpdateResult(g.id, '+-')}
                        className="px-2 py-1 rounded text-xs border text-muted-foreground hover:bg-muted"
                        title="Bỏ cuộc"
                      >
                        +-
                      </button>
                    </div>
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
