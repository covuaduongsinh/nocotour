// Đăng ký công khai qua web, tra cứu trạng thái / lệ phí đã thu, dữ liệu trang công khai (chuyển từ v2 service.ts dòng 642–813).
// Mã đăng ký `GD#####` do DB sinh khi `createPlayer` (v2: trường sequence `ma_dang_ky`, xem phase4.mjs); lõi chỉ đọc lại từ bản ghi trả về.
import { transferContent, vietQrUrl } from '../payments/vietqr.js';
import { TournamentError } from './errors.js';
import { CONFIRMED, clean, need, todayOf, truthy } from './common.js';
import type { Id, TournamentStore as Store } from './types.js';

export const MAX_PER_BANG = 400;

/** Số điện thoại về dạng chỉ chữ số, đầu 84 → 0 (so khớp khi tra cứu). */
export function normalizePhone(value: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- giữ đúng cách chuyển chuỗi của v2 cho mọi kiểu đầu vào
  const digits = String(value ?? '').replace(/\D+/g, '');
  return digits.length >= 11 && digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
}

export type RegisterInput = {
  slug?: string;
  bangDauId?: Id;
  ho_ten?: string;
  nam_sinh?: number | string;
  gioi_tinh?: string;
  clb?: string;
  sdt_lien_he?: string;
  email?: string;
  elo_khai_bao?: number | string;
  dong_y_du_lieu?: unknown;
  dong_y_cong_bo?: unknown;
  website?: string;
};
export type RegisterResult =
  | { honeypot: true }
  | { honeypot: false; ma_dang_ky: string; ho_ten: string; bang: string | null; giai: string | null; giai_slug: string | null; giai_trang_thai: string | null; le_phi: number; trang_thai: string; noi_dung_chuyen_khoan: string };

/** Đăng ký web (không cần tài khoản). Mọi lỗi kiểm tra là 400 (kèm lý do); giải / bảng lạ 404; trùng họ tên + SĐT trong bảng 409. */
export async function registerPlayer(store: Store, input: RegisterInput, guard: () => void = () => undefined): Promise<RegisterResult> {
  // Bẫy spam: trường ẩn có giá trị → luôn trả 200 như thành công nhưng không tạo gì (không qua `guard`, không đưa tín hiệu 429 cho bot; không ghi DB nên vô hại).
  if (clean(input.website, 200)) {
    return { honeypot: true };
  }
  const giai = need(await store.getGiaiBySlug(clean(input.slug, 120)), 404, 'Không có giải này');
  if (giai.trang_thai === 'nhap') {
    throw new TournamentError(404, 'Không có giải này');
  }
  const now = store.now();
  if (giai.trang_thai !== 'mo_dang_ky') {
    throw new TournamentError(400, 'Giải hiện không mở đăng ký');
  }
  if (giai.han_dang_ky && todayOf(now) > giai.han_dang_ky) {
    throw new TournamentError(400, `Đã hết hạn đăng ký (${giai.han_dang_ky})`);
  }
  const bang = (await store.listBang(giai.id)).find((item) => String(item.id) === String(input.bangDauId));
  if (!bang) {
    throw new TournamentError(400, 'Vui lòng chọn bảng đấu');
  }
  const hoTen = clean(input.ho_ten, 80);
  if (hoTen.length < 2) {
    throw new TournamentError(400, 'Vui lòng nhập họ và tên (2–80 ký tự)');
  }
  const year = Number(input.nam_sinh);
  const thisYear = Number(todayOf(now).slice(0, 4));
  if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
    throw new TournamentError(400, 'Năm sinh không hợp lệ');
  }
  if ((bang.nam_sinh_tu !== null && year < bang.nam_sinh_tu) || (bang.nam_sinh_den !== null && year > bang.nam_sinh_den)) {
    throw new TournamentError(400, `Năm sinh ${year} không thuộc bảng ${bang.ten ?? ''}`);
  }
  const phone = normalizePhone(input.sdt_lien_he);
  if (phone.length < 9 || phone.length > 12) {
    throw new TournamentError(400, 'Số điện thoại không hợp lệ');
  }
  const email = clean(input.email, 120);
  if (email && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) {
    throw new TournamentError(400, 'Email không hợp lệ');
  }
  if (!truthy(input.dong_y_du_lieu)) {
    throw new TournamentError(400, 'Cần đồng ý để Dương Sinh Chess xử lý thông tin đăng ký');
  }
  let elo: number | null = null;
  if (input.elo_khai_bao !== undefined && input.elo_khai_bao !== null && String(input.elo_khai_bao).trim() !== '') {
    elo = Number(input.elo_khai_bao);
    if (!Number.isInteger(elo) || elo < 0 || elo > 3500) {
      throw new TournamentError(400, 'Elo phải là số nguyên từ 0 đến 3500');
    }
  }
  const gender = ['nam', 'nu'].includes(String(input.gioi_tinh)) ? String(input.gioi_tinh) : null;
  const existing = await store.listPlayers(bang.id);
  if (existing.length >= MAX_PER_BANG) {
    throw new TournamentError(409, 'Bảng đấu đã đủ số lượng đăng ký');
  }
  if (existing.some((player) => player.trang_thai !== 'rut_lui' && normalizePhone(player.sdt_lien_he) === phone && player.ho_ten.toLowerCase() === hoTen.toLowerCase())) {
    throw new TournamentError(409, 'Đã có đăng ký trùng họ tên và số điện thoại trong bảng này. Hãy dùng trang tra cứu.');
  }
  // Mọi kiểm tra dữ liệu đã đạt: tới đây mới áp giới hạn tần suất (yêu cầu sai dữ liệu luôn nhận lỗi cụ thể, không tạo gì nên không tính).
  guard();
  const fee = bang.le_phi;
  const created = await store.createPlayer({
    bangDauId: bang.id,
    hocVienId: null,
    ho_ten: hoTen,
    nam_sinh: year,
    gioi_tinh: gender,
    clb: clean(input.clb, 80) || null,
    sdt_lien_he: phone,
    email: email || null,
    trang_thai: fee > 0 ? 'cho_thanh_toan' : CONFIRMED,
    elo_khai_bao: elo,
    elo_xep: null,
    so_xuat_phat: null,
    dong_y_cong_bo: truthy(input.dong_y_cong_bo),
    dong_y_du_lieu: true,
    le_phi: fee,
    da_thu: 0,
    nguon: 'web',
  });
  const ma = String(created.ma_dang_ky ?? '');
  return { honeypot: false, ma_dang_ky: ma, ho_ten: hoTen, bang: bang.ten, giai: giai.ten, giai_slug: giai.slug, giai_trang_thai: giai.trang_thai, le_phi: fee, trang_thai: created.trang_thai, noi_dung_chuyen_khoan: transferContent(ma) };
}

/** Tra cứu: phải khớp CẢ mã đăng ký lẫn SĐT; sai một trong hai đều trả đúng một thông báo 404 (không dò được mã). Chỉ trả trạng thái và số tiền. */
export async function playerStatus(store: Store, input: { ma?: string; sdt?: string }) {
  const notFound = new TournamentError(404, 'Không tìm thấy đăng ký với mã và số điện thoại này');
  const digits = String(input.ma ?? '').replace(/\D+/g, '');
  const valid = /^GD\s?\d{5}$/i.test(String(input.ma ?? '').trim()) && digits.length === 5;
  const phone = normalizePhone(input.sdt);
  if (!valid || phone.length < 9) {
    throw notFound;
  }
  const code = `GD${digits}`;
  const player = await store.getPlayerByCode(code);
  if (!player || normalizePhone(player.sdt_lien_he) !== phone) {
    throw notFound;
  }
  const paid = player.da_thu ?? 0;
  return {
    ma_dang_ky: code,
    trang_thai: player.trang_thai,
    le_phi: player.le_phi,
    da_thu: paid,
    con_thieu: Math.max(0, player.le_phi - paid),
    noi_dung_chuyen_khoan: transferContent(code),
  };
}

/** Dữ liệu trang công khai của giải (giải nháp → 404). */
export async function pageModel(store: Store, input: { slug?: string }) {
  const giai = need(await store.getGiaiBySlug(clean(input.slug, 120)), 404, 'Không có giải này');
  if (giai.trang_thai === 'nhap') {
    throw new TournamentError(404, 'Không có giải này');
  }
  const out = [];
  for (const bang of await store.listBang(giai.id)) {
    const players = await store.listPlayers(bang.id);
    out.push({
      id: bang.id,
      ten: bang.ten,
      the_thuc: bang.the_thuc,
      so_vong: bang.so_vong,
      thoi_gian: bang.thoi_gian,
      le_phi: bang.le_phi,
      nam_sinh_tu: bang.nam_sinh_tu,
      nam_sinh_den: bang.nam_sinh_den,
      so_ky_thu: players.filter((player) => player.trang_thai !== 'rut_lui').length,
    });
  }
  const open = giai.trang_thai === 'mo_dang_ky' && !(giai.han_dang_ky && todayOf(store.now()) > giai.han_dang_ky);
  return {
    giai: { ten: giai.ten, slug: giai.slug, trang_thai: giai.trang_thai, dia_diem: giai.dia_diem, ngay_bat_dau: giai.ngay_bat_dau, ngay_ket_thuc: giai.ngay_ket_thuc, han_dang_ky: giai.han_dang_ky, mo_ta: giai.mo_ta, dieu_le: giai.dieu_le },
    bang: out,
    mo_dang_ky: open,
  };
}

/** `qr_url` của API đăng ký (JSON): URL VietQR khi có lệ phí, `null` khi miễn lệ phí (v2 plugin.ts `registerAction`). */
export function registerQrUrl(registered: { le_phi: number; ma_dang_ky: string }): string | null {
  return registered.le_phi > 0 ? vietQrUrl({ amount: registered.le_phi, ma: registered.ma_dang_ky }) : null;
}
