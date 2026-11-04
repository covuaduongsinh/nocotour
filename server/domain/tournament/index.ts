// Lõi giải đấu thuần TypeScript (chuyển từ plugin-dsc-tournament của v2): không phụ thuộc NocoBase hay cơ sở dữ liệu.
export { pairRound } from './swiss.js';
export type { PairResult, Pairing, PlayedGame, SwissPlayer } from './swiss.js';
export { roundRobin } from './roundRobin.js';
export type { RoundRobinGame, RoundRobinRound } from './roundRobin.js';
export { standings } from './standings.js';
export type { StandGame, StandPlayer, StandRow } from './standings.js';
export { ELO_DEFAULT, ELO_K, computeElo, expectedScore, initialElo } from './elo.js';
export type { EloChange, EloEntry, EloGame } from './elo.js';
export { trf16 } from './trf.js';
export type { TrfGame, TrfHeader, TrfPlayer } from './trf.js';

// Dịch vụ giải đấu (DS-17): đăng ký, lệ phí, xếp cặp, kết thúc giải, trang công khai.
export { TournamentError } from './errors.js';
export type {
  Actor, Bang, EloRow, Game, Giai, GiayKhen, Id, Player, Student, TournamentStore,
} from './types.js';
export { enroll, pair, swap, result } from './matches.js';
export { certificate, finish, trf } from './finish.js';
export {
  findStudents, mySummary, pairingsAction, refereeOverview, refereePairings, refereeStandings, standingsAction,
} from './views.js';
export { MAX_PER_BANG, normalizePhone, pageModel, playerStatus, registerPlayer, registerQrUrl } from './registration.js';
export type { RegisterInput, RegisterResult } from './registration.js';
export {
  BANK, CSP, clientIpOf, esc, layout, renderError, renderGiaiPage, renderLookup, renderMarkdown, renderPairings,
  renderRegistered, renderStandings, renderThanks,
} from './publicPage.js';
export {
  MSG_TOO_MANY_LOOKUPS, MSG_TOO_MANY_REGISTRATIONS, MSG_TOO_MANY_REQUESTS, PAGE_LIMIT, PAGE_WINDOW_MS, PUBLIC_LIMIT,
  PUBLIC_WINDOW_MS, REGISTER_LIMIT_DEFAULT, REGISTER_WINDOW_MS, RateLimiter, STATUS_LIMIT, STATUS_WINDOW_MS,
  registerGuard, registerLimitFrom,
} from './rateLimit.js';
