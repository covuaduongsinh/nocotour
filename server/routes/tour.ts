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

  // 3. Division Standings & Games
  router.get('/divisions/:id/standings', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

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

      return c.json({
        ok: true,
        data: {
          division,
          currentRound,
          standings: calculatedStandings,
          totalPlayers: players.length,
          totalGames: games.length,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 4. Pair Next Round (Swiss FIDE Dutch or Round-Robin)
  router.post('/divisions/:id/pair-round', async (c) => {
    try {
      const divisionId = c.req.param('id');
      const q = getQuery();
      const division = await q.selectFrom('tourDivisions').selectAll().where('id', '=', divisionId).executeTakeFirst();
      if (!division) {
        return c.json({ ok: false, error: 'Division not found' }, 404);
      }

      const nextRound = (division.currentRound || 0) + 1;
      if (nextRound > (division.totalRounds || 5)) {
        return c.json({ ok: false, error: `Giải đấu đã hoàn thành tối đa ${division.totalRounds} vòng` }, 400);
      }

      const players = await q.selectFrom('tourPlayers').selectAll().where('divisionId', '=', divisionId).where('status', '=', 'active').execute();
      if (players.length < 2) {
        return c.json({ ok: false, error: 'Cần ít nhất 2 kỳ thủ để bốc thăm' }, 400);
      }

      const games = await q.selectFrom('tourGames').selectAll().where('divisionId', '=', divisionId).execute();

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
        const roundPairs = rrRounds[nextRound - 1]?.games || [];
        pairings = {
          pairs: roundPairs.map((p: any, idx: number) => ({ white: p.white, black: p.black, board: idx + 1 })),
          bye: null,
          warnings: [],
        };
      } else {
        pairings = pairRound(swissPlayers, playedGames, nextRound);
      }

      const now = new Date();
      const roundId = `rd-${divisionId}-${nextRound}`;

      // Insert Round
      await q.insertInto('tourRounds').values({
        id: roundId,
        divisionId,
        roundNumber: nextRound,
        status: 'paired',
        startTime: now.toISOString(),
        notes: pairings.warnings.join('; '),
        createdAt: now,
        updatedAt: now,
      }).execute();

      // Insert Games
      for (const pair of pairings.pairs) {
        const gameId = `gm-${divisionId}-r${nextRound}-b${pair.board}`;
        await q.insertInto('tourGames').values({
          id: gameId,
          divisionId,
          roundId,
          roundNumber: nextRound,
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
        const byeGameId = `gm-${divisionId}-r${nextRound}-bye`;
        await q.insertInto('tourGames').values({
          id: byeGameId,
          divisionId,
          roundId,
          roundNumber: nextRound,
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
        .set({ currentRound: nextRound, status: 'in_progress', updatedAt: now })
        .where('id', '=', divisionId)
        .execute();

      return c.json({
        ok: true,
        data: {
          roundNumber: nextRound,
          pairings: pairings.pairs,
          bye: pairings.bye,
          warnings: pairings.warnings,
        },
      });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 5. Update Game Result (1-0, 0-1, 1/2, +-, -+, bye)
  router.post('/games/:id/result', async (c) => {
    try {
      const gameId = c.req.param('id');
      const body = await c.req.json();
      const { result, pgnNotation } = body;

      if (!['1-0', '0-1', '1/2', '+-', '-+', '--', 'bye', 'chua_co'].includes(result)) {
        return c.json({ ok: false, error: 'Kết quả không hợp lệ (1-0, 0-1, 1/2, +-, -+, bye)' }, 400);
      }

      const q = getQuery();
      const now = new Date();
      await q.updateTable('tourGames')
        .set({
          result,
          pgnNotation: pgnNotation || null,
          updatedAt: now,
        })
        .where('id', '=', gameId)
        .execute();

      return c.json({ ok: true, message: `Cập nhật kết quả ván đấu thành công (${result})` });
    } catch (err: any) {
      return c.json({ ok: false, error: err.message }, 500);
    }
  });

  // 6. Export FIDE TRF Format
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
