// Kiểu dữ liệu và cổng `TournamentStore` của dịch vụ giải đấu (chuyển từ v2 plugin-dsc-tournament/src/server/service.ts, dòng 10–110).
// Truy cập dữ liệu chỉ qua cổng này để lõi không phụ thuộc DB; service ở server/providers/ hiện thực bằng repository.
export type Id = number | string;
export type Actor = { userId: Id | null; roles: string[] };
export type Giai = {
  id: Id;
  ten: string | null;
  slug: string | null;
  trang_thai: string | null;
  so_giai_thuong: number;
  mien_phi_hoc_vien: boolean;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  dia_diem: string | null;
  han_dang_ky: string | null;
  mo_ta: string | null;
  dieu_le: string | null;
  coSoId: Id | null;
};
export type Bang = {
  id: Id;
  giaiDauId: Id;
  ten: string | null;
  the_thuc: string;
  so_vong: number | null;
  vong_hien_tai: number;
  trang_thai: string | null;
  thoi_gian: string | null;
  le_phi: number;
  nam_sinh_tu: number | null;
  nam_sinh_den: number | null;
};
export type Player = {
  id: Id;
  bangDauId: Id;
  hocVienId: Id | null;
  ho_ten: string;
  nam_sinh: number | null;
  gioi_tinh: string | null;
  clb: string | null;
  trang_thai: string;
  elo_khai_bao: number | null;
  elo_xep: number | null;
  so_xuat_phat: number | null;
  dong_y_cong_bo: boolean;
  le_phi: number;
  ma_dang_ky?: string | null;
  sdt_lien_he?: string | null;
  da_thu?: number;
};
export type Game = { id: Id; bangDauId: Id; vong: number; ban: number; ket_qua: string; trangId: Id | null; denId: Id | null; doi_tay: boolean };
export type Student = { id: Id; ho_ten: string | null; ngay_sinh: string | null; gioi_tinh: string | null; elo: number | null; so_van_elo: number; capThuTu: number | null };
export type EloRow = { id: Id; giaiDauId: Id; hocVienId: Id; elo_truoc: number; elo_sau: number; thay_doi: number; so_van: number; ngay?: string | null };
export type GiayKhen = { id: Id; so: string; hang: number; kyThuId: Id; bangDauId: Id; hocVienId: Id | null; ho_ten_tren_giay: string | null; ngay_cap: string | null };

export type TournamentStore = {
  now(): Date;
  getGiai(id: Id): Promise<Giai | null>;
  getGiaiBySlug(slug: string): Promise<Giai | null>;
  updateGiai(id: Id, values: Partial<Pick<Giai, 'trang_thai'>>): Promise<void>;
  getBang(id: Id): Promise<Bang | null>;
  listBang(giaiDauId: Id): Promise<Bang[]>;
  updateBang(id: Id, values: Partial<Pick<Bang, 'vong_hien_tai' | 'trang_thai' | 'so_vong'>>): Promise<void>;
  listPlayers(bangDauId: Id): Promise<Player[]>;
  createPlayer(values: Omit<Player, 'id' | 'ma_dang_ky'> & { da_thu: number; nguon: string; email?: string | null; dong_y_du_lieu?: boolean }): Promise<Player>;
  getPlayerByCode(ma: string): Promise<Player | null>;
  updatePlayer(id: Id, values: Record<string, unknown>): Promise<void>;
  listGames(bangDauId: Id): Promise<Game[]>;
  createGame(values: Omit<Game, 'id'>): Promise<Game>;
  updateGame(id: Id, values: Partial<Omit<Game, 'id'>>): Promise<void>;
  deleteGame(id: Id): Promise<void>;
  getGame(id: Id): Promise<Game | null>;
  getStudents(ids: Id[]): Promise<Student[]>;
  studentIdsOfClass(lopId: Id): Promise<Id[]>;
  listEloOfGiai(giaiDauId: Id): Promise<EloRow[]>;
  saveElo(values: Omit<EloRow, 'id'> & { ngay: string }): Promise<void>;
  setStudentElo(hocVienId: Id, elo: number, soVan: number): Promise<void>;
  listGiayKhen(bangDauId: Id): Promise<GiayKhen[]>;
  saveGiayKhen(values: { kyThuId: Id; bangDauId: Id; hocVienId: Id | null; hang: number; ho_ten_tren_giay: string; ngay_cap: string }): Promise<GiayKhen>;
  getGiayKhen(id: Id): Promise<GiayKhen | null>;
  getKyThu(id: Id): Promise<Player | null>;
  /** Mọi giải (giao diện trọng tài), mới nhất trước. */
  listGiai(): Promise<Giai[]>;
  listClasses(): Promise<Array<{ id: Id; ten: string | null }>>;
  /** Học viên đang học theo tên / mã (tối đa `limit`). */
  searchStudents(query: string, limit: number): Promise<Array<{ id: Id; ho_ten: string | null; ma_hoc_vien: string | null }>>;
  /** Các lần đăng ký giải của một học viên (mọi bảng). */
  listPlayersOfStudent(hocVienId: Id): Promise<Player[]>;
  listEloOfStudent(hocVienId: Id): Promise<EloRow[]>;
  listGiayKhenOfStudent(hocVienId: Id): Promise<GiayKhen[]>;
  isParentOf(userId: Id, hocVienId: Id): Promise<boolean>;
  getCoSoName(id: Id): Promise<string | null>;
};
