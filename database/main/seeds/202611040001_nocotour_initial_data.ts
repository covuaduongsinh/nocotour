import { defineSeed, type SeedDefinition } from '@nocobase/db';

const seed: SeedDefinition = defineSeed({
  name: '202611040001_nocotour_initial_data',
  async run({ query }: any) {
    const now = new Date();

    // 1. Tournaments
    const tournaments = [
      {
        id: 'tour-winter-2026',
        name: 'Giải Vô Địch Cờ Vua Trẻ Dương Sinh Mùa Đông 2026',
        slug: 'duong-sinh-winter-cup-2026',
        format: 'swiss',
        status: 'in_progress',
        startDate: '2026-11-15',
        endDate: '2026-11-16',
        registrationDeadline: '2026-11-12',
        location: 'Trụ sở Dương Sinh Chess - 31 ngõ 159 Pháo Đài Láng, Đống Đa, Hà Nội',
        organizer: 'Công ty CP Cờ Vua Dương Sinh',
        regulations: 'Thi đấu theo Luật Cờ vua FIDE hiện hành. Thể thức Thụy Sĩ 5 ván, thời gian 15 phút + 10 giây mỗi nước đi.',
        description: 'Giải đấu cờ nhanh dành cho học viên và các kỳ thủ nhí xuất sắc từ các cơ sở Hà Nội, Vĩnh Phúc, Thái Nguyên.',
        entryFee: 250000,
        coSoId: 'cs-phao-dai-lang',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tour-club-open-2026',
        name: 'Giải Cờ Vua Giao Hữu CLB Mở Rộng Cup Kỳ Vương Nhí',
        slug: 'ky-vuong-nhi-open-2026',
        format: 'swiss',
        status: 'registration',
        startDate: '2026-12-05',
        endDate: '2026-12-06',
        registrationDeadline: '2026-12-01',
        location: 'Trung tâm Văn hóa Thể thao Đống Đa, Hà Nội',
        organizer: 'Dương Sinh Chess Club',
        regulations: 'Áp dụng hệ Thụy Sĩ FIDE Dutch. Có tính hệ số Elo nội bộ DSC.',
        description: 'Giải đấu mở rộng quy tụ hơn 100 kỳ thủ thiếu nhi toàn miền Bắc.',
        entryFee: 300000,
        coSoId: 'cs-phao-dai-lang',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const t of tournaments) {
      const existing = await query
        .selectFrom('tourTournaments')
        .select('id')
        .where('id', '=', t.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourTournaments').values(t).execute();
      }
    }

    // 2. Divisions
    const divisions = [
      {
        id: 'div-u9-winter',
        tournamentId: 'tour-winter-2026',
        name: 'Bảng U9 (Năm sinh 2017 trở lại đây)',
        pairingSystem: 'swiss',
        totalRounds: 5,
        currentRound: 1,
        status: 'in_progress',
        birthYearFrom: 2017,
        birthYearTo: 2022,
        maxElo: 1400,
        entryFee: 250000,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'div-open-winter',
        tournamentId: 'tour-winter-2026',
        name: 'Bảng Mở Rộng Open (Không giới hạn độ tuổi)',
        pairingSystem: 'swiss',
        totalRounds: 5,
        currentRound: 0,
        status: 'pending',
        birthYearFrom: 2005,
        birthYearTo: 2020,
        maxElo: 2200,
        entryFee: 250000,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const d of divisions) {
      const existing = await query
        .selectFrom('tourDivisions')
        .select('id')
        .where('id', '=', d.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourDivisions').values(d).execute();
      }
    }

    // 3. Players in U9
    const players = [
      { id: 'p-u9-01', divisionId: 'div-u9-winter', fullName: 'Nguyễn Minh Khang', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', status: 'active', declaredElo: 1250, startingElo: 1250, seedNumber: 1, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345601', registrationCode: 'DSC-P001', createdAt: now, updatedAt: now },
      { id: 'p-u9-02', divisionId: 'div-u9-winter', fullName: 'Trần Gia Bảo', birthYear: 2017, gender: 'M', club: 'DSC Kim Liên', status: 'active', declaredElo: 1210, startingElo: 1210, seedNumber: 2, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345602', registrationCode: 'DSC-P002', createdAt: now, updatedAt: now },
      { id: 'p-u9-03', divisionId: 'div-u9-winter', fullName: 'Lê Bảo Châu', birthYear: 2018, gender: 'F', club: 'DSC Pháo Đài Láng', status: 'active', declaredElo: 1180, startingElo: 1180, seedNumber: 3, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345603', registrationCode: 'DSC-P003', createdAt: now, updatedAt: now },
      { id: 'p-u9-04', divisionId: 'div-u9-winter', fullName: 'Phạm Nhật Nam', birthYear: 2017, gender: 'M', club: 'DSC Vĩnh Phúc', status: 'active', declaredElo: 1150, startingElo: 1150, seedNumber: 4, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345604', registrationCode: 'DSC-P004', createdAt: now, updatedAt: now },
      { id: 'p-u9-05', divisionId: 'div-u9-winter', fullName: 'Hoàng Tuấn Kiệt', birthYear: 2018, gender: 'M', club: 'CLB Cờ Vua Hoàn Kiếm', status: 'active', declaredElo: 1120, startingElo: 1120, seedNumber: 5, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345605', registrationCode: 'DSC-P005', createdAt: now, updatedAt: now },
      { id: 'p-u9-06', divisionId: 'div-u9-winter', fullName: 'Vũ Đức Trí', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', status: 'active', declaredElo: 1100, startingElo: 1100, seedNumber: 6, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345606', registrationCode: 'DSC-P006', createdAt: now, updatedAt: now },
      { id: 'p-u9-07', divisionId: 'div-u9-winter', fullName: 'Đặng Tuệ Mẫn', birthYear: 2018, gender: 'F', club: 'DSC Kim Liên', status: 'active', declaredElo: 1080, startingElo: 1080, seedNumber: 7, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345607', registrationCode: 'DSC-P007', createdAt: now, updatedAt: now },
      { id: 'p-u9-08', divisionId: 'div-u9-winter', fullName: 'Bùi Hải Đăng', birthYear: 2017, gender: 'M', club: 'CLB Cờ Vua Cầu Giấy', status: 'active', declaredElo: 1050, startingElo: 1050, seedNumber: 8, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345608', registrationCode: 'DSC-P008', createdAt: now, updatedAt: now },
      { id: 'p-u9-09', divisionId: 'div-u9-winter', fullName: 'Đỗ Quỳnh Chi', birthYear: 2018, gender: 'F', club: 'DSC Vĩnh Phúc', status: 'active', declaredElo: 1020, startingElo: 1020, seedNumber: 9, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345609', registrationCode: 'DSC-P009', createdAt: now, updatedAt: now },
      { id: 'p-u9-10', divisionId: 'div-u9-winter', fullName: 'Ngô Đức Thắng', birthYear: 2017, gender: 'M', club: 'DSC Pháo Đài Láng', status: 'active', declaredElo: 1000, startingElo: 1000, seedNumber: 10, publicConsent: true, entryFee: 250000, paidFee: 250000, phone: '0912345610', registrationCode: 'DSC-P010', createdAt: now, updatedAt: now },
    ];

    for (const p of players) {
      const existing = await query
        .selectFrom('tourPlayers')
        .select('id')
        .where('id', '=', p.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourPlayers').values(p).execute();
      }
    }

    // 4. Round 1 in U9
    const round1Id = 'rd-u9-01';
    const existingR1 = await query
      .selectFrom('tourRounds')
      .select('id')
      .where('id', '=', round1Id)
      .executeTakeFirst();
    if (!existingR1) {
      await query.insertInto('tourRounds').values({
        id: round1Id,
        divisionId: 'div-u9-winter',
        roundNumber: 1,
        status: 'completed',
        startTime: '2026-11-15 08:30:00',
        notes: 'Vòng 1 hoàn thành đúng thời gian quy định.',
        createdAt: now,
        updatedAt: now,
      }).execute();
    }

    // 5. Games in Round 1
    const round1Games = [
      { id: 'gm-u9-01', divisionId: 'div-u9-winter', roundId: round1Id, roundNumber: 1, boardNumber: 1, whitePlayerId: 'p-u9-01', blackPlayerId: 'p-u9-06', result: '1-0', colorInverted: false, pgnNotation: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. c3 O-O 7. Nbd2 a6 8. Re1 1-0', createdAt: now, updatedAt: now },
      { id: 'gm-u9-02', divisionId: 'div-u9-winter', roundId: round1Id, roundNumber: 1, boardNumber: 2, whitePlayerId: 'p-u9-07', blackPlayerId: 'p-u9-02', result: '0-1', colorInverted: false, pgnNotation: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3 Be7 5. Bg5 O-O 6. e3 Nbd7 0-1', createdAt: now, updatedAt: now },
      { id: 'gm-u9-03', divisionId: 'div-u9-winter', roundId: round1Id, roundNumber: 1, boardNumber: 3, whitePlayerId: 'p-u9-03', blackPlayerId: 'p-u9-08', result: '1-0', colorInverted: false, pgnNotation: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 1-0', createdAt: now, updatedAt: now },
      { id: 'gm-u9-04', divisionId: 'div-u9-winter', roundId: round1Id, roundNumber: 1, boardNumber: 4, whitePlayerId: 'p-u9-09', blackPlayerId: 'p-u9-04', result: '1/2', colorInverted: false, pgnNotation: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1/2-1/2', createdAt: now, updatedAt: now },
      { id: 'gm-u9-05', divisionId: 'div-u9-winter', roundId: round1Id, roundNumber: 1, boardNumber: 5, whitePlayerId: 'p-u9-05', blackPlayerId: 'p-u9-10', result: '1-0', colorInverted: false, pgnNotation: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 1-0', createdAt: now, updatedAt: now },
    ];

    for (const g of round1Games) {
      const existing = await query
        .selectFrom('tourGames')
        .select('id')
        .where('id', '=', g.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourGames').values(g).execute();
      }
    }

    // 6. Standings Snapshot for Round 1
    const standings = [
      { id: 'std-u9-01', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-01', rank: 1, points: 1.0, buchholzTotal: 0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 1, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-02', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-02', rank: 2, points: 1.0, buchholzTotal: 0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 1, blackWins: 1, createdAt: now, updatedAt: now },
      { id: 'std-u9-03', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-03', rank: 3, points: 1.0, buchholzTotal: 0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 1, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-05', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-05', rank: 4, points: 1.0, buchholzTotal: 0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 1, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-04', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-04', rank: 5, points: 0.5, buchholzTotal: 0.5, buchholzCut1: 0, sonnebornBerger: 0.25, directEncounter: 0.5, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-09', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-09', rank: 6, points: 0.5, buchholzTotal: 0.5, buchholzCut1: 0, sonnebornBerger: 0.25, directEncounter: 0.5, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-06', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-06', rank: 7, points: 0.0, buchholzTotal: 1.0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-07', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-07', rank: 8, points: 0.0, buchholzTotal: 1.0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-08', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-08', rank: 9, points: 0.0, buchholzTotal: 1.0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
      { id: 'std-u9-10', divisionId: 'div-u9-winter', roundNumber: 1, playerId: 'p-u9-10', rank: 10, points: 0.0, buchholzTotal: 1.0, buchholzCut1: 0, sonnebornBerger: 0, directEncounter: 0, wins: 0, blackWins: 0, createdAt: now, updatedAt: now },
    ];

    for (const s of standings) {
      const existing = await query
        .selectFrom('tourStandings')
        .select('id')
        .where('id', '=', s.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourStandings').values(s).execute();
      }
    }

    // 7. Referees
    const referees = [
      {
        id: 'ref-01',
        tournamentId: 'tour-winter-2026',
        fullName: 'Dương Sinh',
        role: 'chief_arbiter',
        phone: '0988888888',
        fideId: 'VIE-123456',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ref-02',
        tournamentId: 'tour-winter-2026',
        fullName: 'Nguyễn Văn Hùng',
        role: 'arbiter',
        phone: '0912345678',
        fideId: 'VIE-234567',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const r of referees) {
      const existing = await query
        .selectFrom('tourReferees')
        .select('id')
        .where('id', '=', r.id)
        .executeTakeFirst();
      if (!existing) {
        await query.insertInto('tourReferees').values(r).execute();
      }
    }
  },
});

export default seed;
