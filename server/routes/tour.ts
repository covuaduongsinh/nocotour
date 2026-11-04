import { Hono } from 'hono';
import { pairRound } from '../domain/tournament/swiss.js';
import { roundRobin } from '../domain/tournament/roundRobin.js';
import { standings } from '../domain/tournament/standings.js';
import { trf16 } from '../domain/tournament/trf.js';

export function createTourRoutes(db: any) {
  const router = new Hono();

  function getQuery() {
    return typeof db.query === 'function' ? db.query() : (db.query || db);
  }

  // 1. Dashboard Overview
  router.get('/overview', async (c) => {
    try {
      const q = getQuery();
      const tournaments = await q.selectFrom('tourTournaments').selectAll().execute();
      const divisions = await q.selectFrom('tourDivisions').selectAll().execute();
      const players = await q.selectFrom('tourPlayers').selectAll().execute();
      const games = await q.selectFrom('tourGames').selectAll().execute();

      const activeTournaments = tournaments.filter((t: any) => t.status === 'in_progress' || t.status === 'registration').length;
      const totalPlayers = players.length;
      const completedGames = games.filter((g: any) => g.result && g.result !== 'chua_co').length;
      const totalGames = games.length;

      return c.json({
        ok: true,
        data: {
          activeTournaments,
          totalTournaments: tournaments.length,
          totalDivisions: divisions.length,
          totalPlayers,
          totalGames,
          completedGames,
          tournaments,
          divisions,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 2. Tournaments List & Details
  router.get('/tournaments', async (c) => {
    try {
      const q = getQuery();
      const list = await q.selectFrom('tourTournaments').selectAll().execute();
      const divisions = await q.selectFrom('tourDivisions').selectAll().execute();
      const players = await q.selectFrom('tourPlayers').selectAll().execute();

      const enriched = list.map((t: any) => {
        const divList = divisions.filter((d: any) => d.tournamentId === t.id);
        const divIds = new Set(divList.map((d: any) => d.id));
        const playList = players.filter((p: any) => divIds.has(p.divisionId));
        return {
          ...t,
          divisionsCount: divList.length,
          playersCount: playList.length,
          divisions: divList,
        };
      });

      return c.json({ ok: true, data: enriched });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // Players List
  router.get('/players', async (c) => {
    try {
      const q = getQuery();
      const divisionId = c.req.query('divisionId');
      let query = q.selectFrom('tourPlayers').selectAll();
      if (divisionId) {
        query = query.where('divisionId', '=', divisionId);
      }
      const list = await query.orderBy('seedNumber', 'asc').execute();
      return c.json({ ok: true, data: list });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  router.get('/tournaments/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const q = getQuery();
      const tournament = await q.selectFrom('tourTournaments').selectAll().where('id', '=', id).executeTakeFirst();
      if (!tournament) {
        return c.json({ ok: false, error: 'Tournament not found' }, 404);
      }
      const divisions = await q.selectFrom('tourDivisions').selectAll().where('tournamentId', '=', id).execute();
      return c.json({ ok: true, data: { ...tournament, divisions } });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 3. Divisions List & Details
  router.get('/divisions', async (c) => {
    try {
      const q = getQuery();
      const divisions = await q.selectFrom('tourDivisions').selectAll().execute();
      const tournaments = await q.selectFrom('tourTournaments').selectAll().execute();
      const players = await q.selectFrom('tourPlayers').selectAll().execute();
      const games = await q.selectFrom('tourGames').selectAll().execute();
      const tourMap = new Map(tournaments.map((t: any) => [t.id, t]));

      const enriched = divisions.map((d: any) => ({
        ...d,
        tournament: tourMap.get(d.tournamentId) || null,
        playersCount: players.filter((p: any) => p.divisionId === d.id).length,
        gamesCount: games.filter((g: any) => g.divisionId === d.id).length,
      }));

      return c.json({ ok: true, data: enriched });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  router.get('/divisions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', id).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }
      const tournament = await q.selectFrom('tourTournaments').selectAll().where('id', '=', division.tournamentId).executeTakeFirst();
      const rounds = await q.selectFrom('tourRounds').selectAll().where('divisionId', '=', id).orderBy('roundNumber', 'asc').execute();
      const players = await q.selectFrom('tourPlayers').selectAll().where('divisionId', '=', id).execute();
      const games = await q.selectFrom('tourGames').selectAll().where('divisionId', '=', id).execute();

      return c.json({
        ok: true,
        data: {
          ...division,
          tournament,
          rounds,
          totalPlayers: players.length,
          totalGames: games.length,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 4. Division Rounds
  router.get('/divisions/:id/rounds', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const rounds = await q.selectFrom('tourRounds')
        .selectAll()
        .where('divisionId', '=', divisionId)
        .orderBy('roundNumber', 'asc')
        .execute();
      const games = await q.selectFrom('tourGames')
        .selectAll()
        .where('divisionId', '=', divisionId)
        .execute();

      const enriched = rounds.map((r: any) => {
        const roundGames = games.filter((g: any) => g.roundNumber === r.roundNumber);
        const completed = roundGames.filter((g: any) => g.result && g.result !== 'chua_co').length;
        return {
          ...r,
          totalGames: roundGames.length,
          completedGames: completed,
          isFinished: roundGames.length > 0 && completed === roundGames.length,
        };
      });

      return c.json({ ok: true, data: enriched });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 5. Division Games (by round or all rounds)
  router.get('/divisions/:id/games', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const roundParam = c.req.query('round');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

      const currentRound = division.currentRound || 1;
      const targetRound = roundParam !== undefined ? parseInt(roundParam, 10) : currentRound;

      let gamesQuery = q.selectFrom('tourGames').selectAll().where('divisionId', '=', divisionId);
      if (targetRound > 0) {
        gamesQuery = gamesQuery.where('roundNumber', '=', targetRound);
      }
      const games = await gamesQuery.orderBy('boardNumber', 'asc').execute();
      const players = await q.selectFrom('tourPlayers').selectAll().where('divisionId', '=', divisionId).execute();
      const playerMap = new Map(players.map((p: any) => [p.id, p]));

      const enrichedGames = games.map((g: any) => {
        const white = playerMap.get(g.whitePlayerId);
        const black = g.blackPlayerId ? playerMap.get(g.blackPlayerId) : null;
        const isBye = !g.blackPlayerId || g.result === 'bye';
        return {
          id: g.id,
          divisionId: g.divisionId,
          roundId: g.roundId,
          roundNumber: g.roundNumber,
          board: g.boardNumber,
          whitePlayerId: g.whitePlayerId,
          white: white?.fullName || 'N/A',
          whiteClub: white?.club || 'Dương Sinh Chess',
          whiteElo: white?.startingElo || 1000,
          whiteSeed: white?.seedNumber || 0,
          blackPlayerId: g.blackPlayerId,
          black: isBye ? 'BYE (Nghỉ miễn đấu - Cấp 1 điểm)' : (black?.fullName || 'N/A'),
          blackClub: isBye ? '' : (black?.club || 'Dương Sinh Chess'),
          blackElo: isBye ? 0 : (black?.startingElo || 1000),
          blackSeed: isBye ? 0 : (black?.seedNumber || 0),
          result: g.result || 'chua_co',
          isBye,
          pgnNotation: g.pgnNotation,
          notes: g.notes,
          status: g.result && g.result !== 'chua_co' ? 'done' : 'pending',
        };
      });

      const completedCount = enrichedGames.filter((g: any) => g.status === 'done').length;

      return c.json({
        ok: true,
        data: {
          roundNumber: targetRound,
          currentRound,
          division,
          games: enrichedGames,
          totalBoards: enrichedGames.length,
          completedBoards: completedCount,
          allCompleted: enrichedGames.length > 0 && completedCount === enrichedGames.length,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 6. Division Standings & Calculation (Live Real-time)
  router.get('/divisions/:id/standings', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

      const tournament = await q.selectFrom('tourTournaments').selectAll().where('id', '=', division.tournamentId).executeTakeFirst();
      const players = await q.selectFrom('tourPlayers').selectAll().where('divisionId', '=', divisionId).execute();
      const games = await q.selectFrom('tourGames').selectAll().where('divisionId', '=', divisionId).execute();

      // Transform players & games for pure domain standings engine
      const standPlayers = players.map((p: any) => ({
        id: p.id,
        name: p.fullName,
        seed: p.seedNumber || 999,
        elo: p.startingElo || 1000,
      }));

      const standGames = games.map((g: any) => ({
        round: g.roundNumber,
        white: g.whitePlayerId,
        black: g.blackPlayerId,
        result: g.result,
      }));

      const currentRound = division.currentRound || 1;
      const calculatedStandings = standings(standPlayers, standGames);
      const playerMap = new Map(players.map((p: any) => [p.id, p]));

      const enrichedStandings = calculatedStandings.map((s: any) => {
        const p = playerMap.get(s.id);
        return {
          rank: s.rank,
          playerId: s.id,
          name: p?.fullName || 'N/A',
          club: p?.club || 'Dương Sinh Chess',
          elo: p?.startingElo || 1000,
          seed: p?.seedNumber || s.rank,
          gender: p?.gender || 'M',
          birthYear: p?.birthYear || 2017,
          points: s.points,
          buchholz: s.buchholz,
          cut1: s.buchholzCut1,
          buchholzCut1: s.buchholzCut1,
          berger: s.sonneborn,
          sonnebornBerger: s.sonneborn,
          wins: s.wins,
        };
      });

      return c.json({
        ok: true,
        data: {
          division,
          tournament,
          currentRound,
          totalRounds: division.totalRounds || 5,
          standings: enrichedStandings,
          totalPlayers: players.length,
          totalGames: games.length,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 7. Pair Next Round (Swiss FIDE Dutch or Round-Robin)
  router.post('/divisions/:id/pair-round', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const body = await c.req.json().catch(() => ({}));
      const { force, rePair } = body || {};
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

      const currentRound = division.currentRound || 0;
      let targetRound = currentRound + 1;

      // Handle re-pairing of the current round
      if (rePair && currentRound > 0) {
        targetRound = currentRound;
        await q.deleteFrom('tourGames').where('divisionId', '=', divisionId).where('roundNumber', '=', targetRound).execute();
        await q.deleteFrom('tourRounds').where('divisionId', '=', divisionId).where('roundNumber', '=', targetRound).execute();
      } else {
        if (targetRound > (division.totalRounds || 5)) {
          return c.json({ ok: false, error: `Giải đấu đã hoàn thành tối đa ${division.totalRounds} vòng` }, 400);
        }

        // If currentRound > 0, check if all current games are finished
        if (currentRound > 0 && !force) {
          const currentGames = await q.selectFrom('tourGames')
            .selectAll()
            .where('divisionId', '=', divisionId)
            .where('roundNumber', '=', currentRound)
            .execute();
          const pending = currentGames.filter((g: any) => !g.result || g.result === 'chua_co');
          if (pending.length > 0) {
            return c.json({
              ok: false,
              error: `Vòng ${currentRound} vẫn còn ${pending.length} bàn chưa có kết quả. Vui lòng hoàn tất tỷ số hoặc chọn Bốc thăm cưỡng bức (force).`,
              pendingBoards: pending.map((g: any) => g.boardNumber),
            }, 400);
          }
        }
      }

      const players = await q.selectFrom('tourPlayers')
        .selectAll()
        .where('divisionId', '=', divisionId)
        .where('status', '=', 'active')
        .execute();
      if (players.length < 2) {
        return c.json({ ok: false, error: 'Cần ít nhất 2 kỳ thủ đang thi đấu để bốc thăm' }, 400);
      }

      // Collect games played BEFORE targetRound
      const games = await q.selectFrom('tourGames')
        .selectAll()
        .where('divisionId', '=', divisionId)
        .where('roundNumber', '<', targetRound)
        .execute();

      const playedGames = games.map((g: any) => ({
        round: g.roundNumber,
        white: g.whitePlayerId,
        black: g.blackPlayerId,
        result: g.result,
      }));

      const swissPlayers = players.map((p: any) => ({
        id: p.id,
        seed: p.seedNumber || 999,
      }));

      let pairings: any;
      if (division.pairingSystem === 'round_robin') {
        const rrRounds = roundRobin(swissPlayers.map((p: any) => p.id));
        const roundPairs = rrRounds[targetRound - 1]?.games || [];
        pairings = {
          pairs: roundPairs.map((p: any, idx: number) => ({ white: p.white, black: p.black, board: idx + 1 })),
          bye: null,
          warnings: [],
        };
      } else {
        pairings = pairRound(swissPlayers, playedGames, targetRound);
      }

      const now = new Date();
      const roundId = `rd-${divisionId}-${targetRound}`;

      // Insert Round
      await q.insertInto('tourRounds').values({
        id: roundId,
        divisionId,
        roundNumber: targetRound,
        status: 'paired',
        startTime: now.toISOString(),
        notes: pairings.warnings.join('; ') || `Bốc thăm Vòng ${targetRound}`,
        createdAt: now,
        updatedAt: now,
      }).execute();

      // Insert Games
      for (const pair of pairings.pairs) {
        const gameId = `gm-${divisionId}-r${targetRound}-b${pair.board}`;
        await q.insertInto('tourGames').values({
          id: gameId,
          divisionId,
          roundId,
          roundNumber: targetRound,
          boardNumber: pair.board,
          whitePlayerId: pair.white,
          blackPlayerId: pair.black,
          result: 'chua_co',
          colorInverted: false,
          createdAt: now,
          updatedAt: now,
        }).execute();
      }

      // If there is a Bye player
      if (pairings.bye) {
        const byeGameId = `gm-${divisionId}-r${targetRound}-bye`;
        await q.insertInto('tourGames').values({
          id: byeGameId,
          divisionId,
          roundId,
          roundNumber: targetRound,
          boardNumber: pairings.pairs.length + 1,
          whitePlayerId: pairings.bye,
          blackPlayerId: null,
          result: 'bye',
          colorInverted: false,
          createdAt: now,
          updatedAt: now,
        }).execute();
      }

      // Update division current round
      await q.updateTable('tourDivisions')
        .set({ currentRound: targetRound, status: 'in_progress', updatedAt: now })
        .where('id', '=', divisionId)
        .execute();

      return c.json({
        ok: true,
        message: `Bốc thăm Vòng ${targetRound} thành công! (${pairings.pairs.length} bàn đấu${pairings.bye ? ', 1 kỳ thủ được Bye' : ''})`,
        data: {
          roundNumber: targetRound,
          pairings: pairings.pairs,
          bye: pairings.bye,
          warnings: pairings.warnings,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 8. Update Game Result (1-0, 0-1, 1/2, +-, -+, bye, chua_co)
  router.post('/games/:id/result', async (c) => {
    try {
      const gameId = c.req.param('id');
      const body = await c.req.json();
      const { result, pgnNotation } = body;

      const validResults = ['1-0', '0-1', '1/2', '+-', '-+', '--', 'bye', 'chua_co'];
      if (!validResults.includes(result)) {
        return c.json({ ok: false, error: `Kết quả không hợp lệ (${validResults.join(', ')})` }, 400);
      }

      const q = getQuery();
      const now = new Date();
      await q.updateTable('tourGames')
        .set({
          result,
          pgnNotation: pgnNotation !== undefined ? pgnNotation : null,
          updatedAt: now,
        })
        .where('id', '=', gameId)
        .execute();

      // Check if round is now completed
      const game = await q.selectFrom('tourGames').selectAll().where('id', '=', gameId).executeTakeFirst();
      let roundCompleted = false;
      if (game) {
        const roundGames = await q.selectFrom('tourGames')
          .selectAll()
          .where('divisionId', '=', game.divisionId)
          .where('roundNumber', '=', game.roundNumber)
          .execute();
        const pending = roundGames.filter((g: any) => !g.result || g.result === 'chua_co');
        roundCompleted = pending.length === 0;
        if (roundCompleted) {
          await q.updateTable('tourRounds')
            .set({ status: 'completed', updatedAt: now })
            .where('divisionId', '=', game.divisionId)
            .where('roundNumber', '=', game.roundNumber)
            .execute();
        }
      }

      return c.json({
        ok: true,
        message: `Cập nhật kết quả ván đấu thành công (${result})`,
        roundCompleted,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 9. Rollback Latest Round (Arbiter tool)
  router.post('/divisions/:id/rollback-round', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

      const currentRound = division.currentRound || 0;
      if (currentRound <= 1) {
        return c.json({ ok: false, error: 'Không thể quay lại trước Vòng 1' }, 400);
      }

      // Check if any game in currentRound has already been played
      const currentGames = await q.selectFrom('tourGames')
        .selectAll()
        .where('divisionId', '=', divisionId)
        .where('roundNumber', '=', currentRound)
        .execute();

      const played = currentGames.filter((g: any) => g.result && g.result !== 'chua_co' && g.result !== 'bye');
      if (played.length > 0) {
        return c.json({
          ok: false,
          error: `Vòng ${currentRound} đã có ${played.length} ván được ghi nhận kết quả. Vui lòng reset kết quả các ván trước khi hủy bốc thăm.`,
        }, 400);
      }

      // Delete current round games and round record
      await q.deleteFrom('tourGames').where('divisionId', '=', divisionId).where('roundNumber', '=', currentRound).execute();
      await q.deleteFrom('tourRounds').where('divisionId', '=', divisionId).where('roundNumber', '=', currentRound).execute();

      const prevRound = currentRound - 1;
      const now = new Date();
      await q.updateTable('tourDivisions')
        .set({ currentRound: prevRound, updatedAt: now })
        .where('id', '=', divisionId)
        .execute();

      return c.json({
        ok: true,
        message: `Đã hủy bốc thăm Vòng ${currentRound}, quay về Vòng ${prevRound}`,
        currentRound: prevRound,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 10. Export FIDE TRF Format
  router.get('/divisions/:id/export-trf', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }
      const tournament = await q.selectFrom('tourTournaments').selectAll().where('id', '=', division.tournamentId).executeTakeFirst();
      const players = await q.selectFrom('tourPlayers').selectAll().where('divisionId', '=', divisionId).execute();
      const games = await q.selectFrom('tourGames').selectAll().where('divisionId', '=', divisionId).execute();

      const trfHeader = {
        name: tournament?.name || 'Duong Sinh Chess Tournament',
        city: 'Ha Noi',
        federation: 'VIE',
        dateStart: tournament?.startDate || '2026-11-15',
        dateEnd: tournament?.endDate || '2026-11-16',
        rounds: division.totalRounds || 5,
      };

      const standPlayers = players.map((p: any) => ({
        id: p.id,
        name: p.fullName,
        rating: p.startingElo || 1000,
        birthYear: p.birthYear || 2017,
      }));
      const standGames = games.map((g: any) => ({
        round: g.roundNumber,
        white: g.whitePlayerId,
        black: g.blackPlayerId,
        result: g.result,
      }));
      const ranked = standings(standPlayers, standGames);
      const rankedMap = new Map(ranked.map((r: any) => [r.id, r]));

      const trfPlayers = players.map((p: any, idx: number) => {
        const r = rankedMap.get(p.id) || { points: 0, rank: idx + 1 };
        return {
          id: p.id,
          name: p.fullName,
          seed: p.seedNumber || idx + 1,
          fideId: '',
          federation: 'VIE',
          rating: p.startingElo || 1000,
          birthYear: p.birthYear || 2017,
          sex: p.gender || 'm',
          points: Number(r.points ?? 0),
          rank: Number(r.rank ?? idx + 1),
        };
      });

      const trfGames = games.map((g: any) => ({
        round: g.roundNumber,
        white: g.whitePlayerId,
        black: g.blackPlayerId,
        result: g.result,
      }));

      const trfText = trf16(trfHeader, trfPlayers, trfGames);

      return c.text(trfText, 200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="tour_${divisionId}.trf"`,
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  return router;
}
