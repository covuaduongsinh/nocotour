import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

const migration: MigrationDefinition = defineMigration({
  name: '202611040001_create_nocotour_core',
  irreversible: true,
  async up({ builder }: MigrationContext): Promise<void> {
    // 1. Tournaments (Giải đấu)
    await builder.createCollection('tourTournaments', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.string('slug', { nullable: false });
      c.string('format', { nullable: false }); // swiss, round_robin, mixed
      c.string('status', { nullable: false }); // planned, registration, in_progress, completed, archived
      c.string('startDate');
      c.string('endDate');
      c.string('registrationDeadline');
      c.string('location');
      c.string('organizer');
      c.text('regulations'); // Điều lệ giải
      c.text('description');
      c.integer('entryFee', { defaultValue: 0 });
      c.string('coSoId');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 2. Divisions (Bảng đấu: U7, U9, U11, Mở rộng...)
    await builder.createCollection('tourDivisions', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('tournamentId', { length: 64, nullable: false });
      c.index('tournamentId');
      c.string('name', { nullable: false });
      c.string('pairingSystem', { nullable: false }); // swiss, round_robin
      c.integer('totalRounds', { defaultValue: 5 });
      c.integer('currentRound', { defaultValue: 0 });
      c.string('status', { nullable: false }); // pending, in_progress, finished
      c.integer('birthYearFrom');
      c.integer('birthYearTo');
      c.integer('maxElo');
      c.integer('entryFee', { defaultValue: 0 });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 3. Players (Kỳ thủ đăng ký bảng đấu)
    await builder.createCollection('tourPlayers', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('divisionId', { length: 64, nullable: false });
      c.index('divisionId');
      c.string('studentId', { length: 64 });
      c.string('fullName', { nullable: false });
      c.integer('birthYear');
      c.string('gender'); // M, F
      c.string('club');
      c.string('status', { nullable: false, defaultValue: 'active' }); // active, withdrawn, paused
      c.integer('declaredElo', { defaultValue: 1000 });
      c.integer('startingElo', { defaultValue: 1000 });
      c.integer('seedNumber'); // Số xuất phát (SBN)
      c.boolean('publicConsent', { defaultValue: true });
      c.integer('entryFee', { defaultValue: 0 });
      c.integer('paidFee', { defaultValue: 0 });
      c.string('phone');
      c.string('registrationCode');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 4. Rounds (Vòng đấu)
    await builder.createCollection('tourRounds', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('divisionId', { length: 64, nullable: false });
      c.index('divisionId');
      c.integer('roundNumber', { nullable: false });
      c.string('status', { nullable: false, defaultValue: 'draft' }); // draft, paired, in_progress, completed
      c.string('startTime');
      c.text('notes');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 5. Games (Ván đấu theo bàn)
    await builder.createCollection('tourGames', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('divisionId', { length: 64, nullable: false });
      c.index('divisionId');
      c.string('roundId', { length: 64, nullable: false });
      c.index('roundId');
      c.integer('roundNumber', { nullable: false });
      c.integer('boardNumber', { nullable: false });
      c.string('whitePlayerId', { length: 64 });
      c.string('blackPlayerId', { length: 64 });
      c.string('result', { nullable: false, defaultValue: 'chua_co' }); // chua_co, 1-0, 0-1, 1/2, +-, -+, --, bye
      c.boolean('colorInverted', { defaultValue: false });
      c.text('pgnNotation');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 6. Standings (Bảng xếp hạng thời gian thực)
    await builder.createCollection('tourStandings', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('divisionId', { length: 64, nullable: false });
      c.index('divisionId');
      c.integer('roundNumber', { nullable: false });
      c.string('playerId', { length: 64, nullable: false });
      c.integer('rank', { nullable: false });
      c.decimal('points', { precision: 5, scale: 1, defaultValue: 0 });
      c.decimal('buchholzTotal', { precision: 6, scale: 2, defaultValue: 0 });
      c.decimal('buchholzCut1', { precision: 6, scale: 2, defaultValue: 0 });
      c.decimal('sonnebornBerger', { precision: 6, scale: 2, defaultValue: 0 });
      c.decimal('directEncounter', { precision: 5, scale: 1, defaultValue: 0 });
      c.integer('wins', { defaultValue: 0 });
      c.integer('blackWins', { defaultValue: 0 });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 7. Elo History (Lịch sử biến động Elo giải đấu)
    await builder.createCollection('tourEloHistory', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('tournamentId', { length: 64, nullable: false });
      c.string('divisionId', { length: 64, nullable: false });
      c.string('playerId', { length: 64, nullable: false });
      c.string('studentId', { length: 64 });
      c.integer('ratingBefore', { defaultValue: 1000 });
      c.integer('ratingAfter', { defaultValue: 1000 });
      c.integer('change', { defaultValue: 0 });
      c.integer('gamesCount', { defaultValue: 0 });
      c.integer('kFactor', { defaultValue: 20 });
      c.string('date');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 8. Certificates (Giấy khen / Chứng nhận)
    await builder.createCollection('tourCertificates', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('tournamentId', { length: 64, nullable: false });
      c.string('divisionId', { length: 64, nullable: false });
      c.string('playerId', { length: 64, nullable: false });
      c.string('studentId', { length: 64 });
      c.string('certificateNumber', { nullable: false });
      c.integer('rank'); // 1, 2, 3, 4, ...
      c.string('titleOnCertificate', { nullable: false }); // Vô địch, Hạng Nhì, Hạng Ba, Khuyến khích, Hoàn thành
      c.string('nameOnCertificate', { nullable: false });
      c.string('issueDate', { nullable: false });
      c.string('pdfUrl');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 9. Referees (Ban Trọng tài)
    await builder.createCollection('tourReferees', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('tournamentId', { length: 64, nullable: false });
      c.string('userId', { length: 64 });
      c.string('fullName', { nullable: false });
      c.string('role', { nullable: false, defaultValue: 'arbiter' }); // chief_arbiter, arbiter, sector_arbiter
      c.string('phone');
      c.string('fideId');
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });

    // 10. TRF Exports (Nhật ký xuất file FIDE TRF)
    await builder.createCollection('tourTrfExports', (c) => {
      c.string('id', { length: 64, nullable: false });
      c.primary('id');
      c.string('tournamentId', { length: 64, nullable: false });
      c.string('divisionId', { length: 64, nullable: false });
      c.string('fileName', { nullable: false });
      c.text('fileContent', { nullable: false });
      c.string('exportedAt', { nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
    });
  },
});

export default migration;
