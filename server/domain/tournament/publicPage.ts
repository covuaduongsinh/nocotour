// Trang công khai của giải đấu: HTML tự chứa, thuần hàm (chuyển từ v2 plugins/plugin-dsc-tournament/src/server/public.ts).
// AN TOÀN: MỌI dữ liệu động đều qua `esc()` (kể cả điều lệ markdown: thoát trước, rồi chỉ bật một tập nhỏ định dạng: tiêu đề, danh sách, đậm, nghiêng, liên kết http/https).
// Không script, không ảnh ngoài trừ mã VietQR (img.vietqr.io); tiêu đề CSP chặt do lớp route gắn kèm (xem CSP).
// Khác v2: `BANK` và URL VietQR dùng lại từ server/domain/payments/vietqr.ts (v2 chép riêng một bản `vietQrUrl(amount, code)`; v3 không xuất lại hàm đó, gọi `vietQrUrl({ amount, ma })` của payments).
// Nội dung chuyển khoản dựng bằng `transferContent` của payments (cùng kết quả `DSC <mã>`).
import type { pairingsAction, standingsAction } from './views.js';
import type { RegisterResult, pageModel, playerStatus } from './registration.js';
import { BANK, transferContent, vietQrUrl } from '../payments/vietqr.js';

export { BANK };

/** Kiểu đầu vào của từng trang: lấy từ kết quả của service nên đổi tên trường ở service sẽ làm typecheck báo lỗi ở đây. */
export type GiaiPageModel = Awaited<ReturnType<typeof pageModel>>;
export type RegisteredResult = Extract<RegisterResult, { honeypot: false }>;
export type LookupStatus = Awaited<ReturnType<typeof playerStatus>>;
export type StandingsView = Awaited<ReturnType<typeof standingsAction>>;
export type PairingsView = Awaited<ReturnType<typeof pairingsAction>>;
type NavGiai = { slug: string | null; trang_thai: string | null };
type BangRow = GiaiPageModel['bang'][number];

export const CSP = "default-src 'none'; img-src https://img.vietqr.io data:; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

export function esc(value: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- giữ đúng cách chuyển chuỗi của v2 cho mọi kiểu đầu vào
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (value: number) => `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
const dmy = (iso: string | null | undefined) => {
  const parts = String(iso ?? '').slice(0, 10).split('-');
  return parts.length === 3 && parts[0] ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
};

function inline(escaped: string): string {
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer nofollow">$1</a>');
}

/** Markdown an toàn: văn bản được thoát HTML TRƯỚC, nên thẻ / thuộc tính người dùng gõ chỉ hiện nguyên văn. */
export function renderMarkdown(source: string | null | undefined): string {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join('<br>')}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length + 2;
      out.push(`<h${level}>${inline(esc(heading[2]))}</h${level}>`);
    } else if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline(esc((bullet ?? numbered)![1]))}</li>`);
    } else {
      closeList();
      paragraph.push(inline(esc(line)));
    }
  }
  flushParagraph();
  closeList();
  return out.join('\n');
}

const STYLE = `
*{box-sizing:border-box}body{margin:0;font-family:Roboto,"Segoe UI",Arial,sans-serif;color:#1f2347;background:#f5f6fb;line-height:1.55;font-size:17px}
header{background:#2B3990;color:#fff;padding:18px 16px}header h1{margin:0;font-size:1.5rem}header p{margin:4px 0 0;opacity:.9}
main{max-width:860px;margin:0 auto;padding:16px}section{background:#fff;border:1px solid #dfe2f0;border-radius:10px;padding:16px;margin:14px 0}
h2{color:#2B3990;margin-top:0;font-size:1.25rem}h3,h4,h5{color:#2B3990}nav a,.btn{display:inline-block;min-height:44px;padding:10px 16px;margin:4px 6px 4px 0;border-radius:8px;background:#2B3990;color:#fff;text-decoration:none;border:0;font-size:1rem;cursor:pointer}
nav a.ghost{background:#fff;color:#2B3990;border:1px solid #2B3990}a{color:#2B3990}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #f2a900;outline-offset:2px}
label{display:block;margin:12px 0 4px;font-weight:600}input,select{width:100%;min-height:44px;padding:8px 10px;font-size:1rem;border:1px solid #9aa0c4;border-radius:8px;background:#fff}
.check{display:flex;gap:10px;align-items:flex-start;margin:12px 0;font-weight:400}.check input{width:24px;min-height:24px;margin-top:3px}.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{border-bottom:1px solid #e3e5f0;padding:8px 6px;text-align:left}th{background:#eef0fa}.num{text-align:right}.wrap{overflow-x:auto}
.ok{color:#237804;font-weight:700}.warn{color:#ad4e00}.err{color:#cf1322}.code{font-size:1.6rem;font-weight:700;letter-spacing:.08em;color:#2B3990}.muted{color:#5b6082}
img.qr{width:100%;max-width:300px;height:auto;display:block;margin:8px auto;border:1px solid #dfe2f0}
footer{max-width:860px;margin:0 auto;padding:8px 16px 28px;color:#5b6082;font-size:.9rem}
`;

export function layout(title: string, body: string, subtitle = ''): string {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${STYLE}</style></head><body><header><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</header><main>${body}</main><footer>Dương Sinh Chess — cờ vua cho trẻ em</footer></body></html>`;
}

const pageUrl = (slug: string | null, extra: Record<string, string | number | null | undefined> = {}) => {
  const params = Object.entries({ slug, ...extra })
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return `/api/dscTournament:page?${params.join('&')}`;
};

function nav(giai: NavGiai): string {
  const live = ['dang_dien_ra', 'ket_thuc'].includes(String(giai.trang_thai));
  return `<nav aria-label="Điều hướng giải đấu"><a href="${esc(pageUrl(giai.slug))}">Thông tin &amp; đăng ký</a>${
    live ? `<a class="ghost" href="${esc(pageUrl(giai.slug, { xem: 'cap-dau' }))}">Cặp đấu</a><a class="ghost" href="${esc(pageUrl(giai.slug, { xem: 'xep-hang' }))}">Bảng xếp hạng</a>` : ''
  }<a class="ghost" href="${esc(pageUrl(giai.slug, { xem: 'tra-cuu' }))}">Tra cứu đăng ký</a></nav>`;
}

function giaiHeader(giai: GiaiPageModel['giai']): string {
  const parts = [giai.dia_diem, giai.ngay_bat_dau ? `${dmy(giai.ngay_bat_dau)}${giai.ngay_ket_thuc && giai.ngay_ket_thuc !== giai.ngay_bat_dau ? ` – ${dmy(giai.ngay_ket_thuc)}` : ''}` : ''].filter(Boolean);
  return parts.join(' · ');
}

const STATUS_TEXT: Record<string, string> = { nhap: 'Nháp', mo_dang_ky: 'Đang mở đăng ký', dong_dang_ky: 'Đã đóng đăng ký', dang_dien_ra: 'Đang diễn ra', ket_thuc: 'Đã kết thúc' };
const PLAYER_TEXT: Record<string, string> = { cho_thanh_toan: 'Chờ thanh toán lệ phí', da_xac_nhan: 'Đã xác nhận', rut_lui: 'Đã rút lui' };

function ageRule(bang: BangRow): string {
  if (bang.nam_sinh_tu && bang.nam_sinh_den) return `sinh năm ${bang.nam_sinh_tu} – ${bang.nam_sinh_den}`;
  if (bang.nam_sinh_tu) return `sinh từ năm ${bang.nam_sinh_tu}`;
  if (bang.nam_sinh_den) return `sinh đến năm ${bang.nam_sinh_den}`;
  return 'mọi lứa tuổi';
}

export function renderGiaiPage(model: GiaiPageModel, notice = ''): string {
  const { giai, bang } = model;
  const rows = bang
    .map(
      (b: BangRow) =>
        `<tr><th scope="row">${esc(b.ten)}</th><td>${esc(b.the_thuc === 'vong_tron' ? 'Vòng tròn' : 'Thuỵ Sĩ')}${b.so_vong ? ` · ${esc(b.so_vong)} vòng` : ''}${b.thoi_gian ? ` · ${esc(b.thoi_gian)}` : ''}</td><td>${esc(ageRule(b))}</td><td class="num">${b.le_phi > 0 ? esc(money(b.le_phi)) : 'Miễn phí'}</td><td class="num">${esc(b.so_ky_thu)}</td></tr>`,
    )
    .join('');
  let register = '';
  if (model.mo_dang_ky && bang.length) {
    const options = bang.map((b: BangRow) => `<option value="${esc(b.id)}">${esc(b.ten)} (${esc(ageRule(b))}${b.le_phi > 0 ? `, ${esc(money(b.le_phi))}` : ', miễn phí'})</option>`).join('');
    register = `<section aria-labelledby="dk"><h2 id="dk">Đăng ký thi đấu</h2>${
      giai.han_dang_ky ? `<p class="muted">Hạn đăng ký: <strong>${esc(dmy(giai.han_dang_ky))}</strong></p>` : ''
    }<form method="post" action="/api/dscTournament:register" accept-charset="utf-8">
<input type="hidden" name="slug" value="${esc(giai.slug)}">
<label for="bang">Bảng đấu</label><select id="bang" name="bangDauId" required>${options}</select>
<label for="ho_ten">Họ và tên kỳ thủ</label><input id="ho_ten" name="ho_ten" maxlength="80" required autocomplete="name">
<label for="nam_sinh">Năm sinh</label><input id="nam_sinh" name="nam_sinh" type="number" inputmode="numeric" min="1900" max="2100" required>
<label for="gioi_tinh">Giới tính (không bắt buộc)</label><select id="gioi_tinh" name="gioi_tinh"><option value="">—</option><option value="nam">Nam</option><option value="nu">Nữ</option></select>
<label for="clb">CLB / trường (không bắt buộc)</label><input id="clb" name="clb" maxlength="80">
<label for="sdt">Số điện thoại liên hệ</label><input id="sdt" name="sdt_lien_he" type="tel" inputmode="tel" maxlength="20" required autocomplete="tel">
<label for="email">Email (không bắt buộc)</label><input id="email" name="email" type="email" maxlength="120" autocomplete="email">
<label for="elo">Elo hiện có (không bắt buộc, chỉ để xếp hạt giống)</label><input id="elo" name="elo_khai_bao" type="number" inputmode="numeric" min="0" max="3500">
<div class="hp" aria-hidden="true"><label for="website">Để trống</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
<label class="check"><input type="checkbox" name="dong_y_du_lieu" value="1" required><span>Tôi đồng ý để Dương Sinh Chess lưu và xử lý thông tin đăng ký này cho mục đích tổ chức giải.</span></label>
<label class="check"><input type="checkbox" name="dong_y_cong_bo" value="1"><span>Cho phép công bố họ tên của kỳ thủ trên bảng xếp hạng (nếu không chọn, trang công khai chỉ hiện "Kỳ thủ #số").</span></label>
<button class="btn" type="submit">Gửi đăng ký</button></form></section>`;
  } else if (!model.mo_dang_ky) {
    register = `<section><p class="warn">${esc(STATUS_TEXT[String(giai.trang_thai)] ?? '')}${giai.trang_thai === 'mo_dang_ky' ? '' : ': hiện không nhận đăng ký mới.'}</p></section>`;
  }
  const body = `${notice ? `<section role="alert"><p class="err">${esc(notice)}</p></section>` : ''}${nav(giai)}
<section><h2>Thông tin giải</h2><p><span class="muted">Trạng thái:</span> <strong>${esc(STATUS_TEXT[String(giai.trang_thai)] ?? '')}</strong></p>${renderMarkdown(giai.mo_ta)}</section>
${giai.dieu_le ? `<section><h2>Điều lệ</h2>${renderMarkdown(giai.dieu_le)}</section>` : ''}
<section><h2>Các bảng đấu</h2><div class="wrap"><table><thead><tr><th scope="col">Bảng</th><th scope="col">Thể thức</th><th scope="col">Độ tuổi</th><th scope="col" class="num">Lệ phí</th><th scope="col" class="num">Đã đăng ký</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Chưa có bảng đấu.</td></tr>'}</tbody></table></div></section>${register}`;
  return layout(String(giai.ten ?? ''), body, giaiHeader(giai));
}

export function renderRegistered(result: RegisteredResult): string {
  const paid = result.le_phi > 0;
  const body = `${result.giai_slug ? nav({ slug: result.giai_slug, trang_thai: result.giai_trang_thai ?? '' }) : ''}<section role="status"><h2>Đã nhận đăng ký</h2>
<p>Mã đăng ký của kỳ thủ <strong>${esc(result.ho_ten)}</strong> (bảng ${esc(result.bang)}):</p><p class="code">${esc(result.ma_dang_ky)}</p>
${
  paid
    ? `<p>Lệ phí: <strong>${esc(money(result.le_phi))}</strong>. Quét mã VietQR để chuyển khoản; hệ thống tự xác nhận khi nhận được tiền (thường trong vài phút).</p>
<img class="qr" src="${esc(vietQrUrl({ amount: result.le_phi, ma: result.ma_dang_ky }))}" alt="Mã VietQR chuyển khoản lệ phí ${esc(money(result.le_phi))} cho đăng ký ${esc(result.ma_dang_ky)}" width="300" height="300">
<p>Hoặc chuyển khoản thủ công: ${esc(BANK.name)} <strong>${esc(BANK.account)}</strong> — ${esc(BANK.accountName)}<br>Số tiền: <strong>${esc(money(result.le_phi))}</strong><br>Nội dung <strong>bắt buộc</strong>: <strong>${esc(transferContent(result.ma_dang_ky))}</strong></p>`
    : '<p class="ok">Giải miễn lệ phí: đăng ký của bạn đã được xác nhận.</p>'
}
<p class="muted">Hãy lưu mã đăng ký. Tra cứu trạng thái bằng mã và số điện thoại đã đăng ký.</p></section>`;
  return layout('Đăng ký thành công', body);
}

/** Bẫy spam: trả trang trông bình thường nhưng KHÔNG có mã và không tạo gì. */
export function renderThanks(): string {
  return layout('Cảm ơn bạn', '<section role="status"><h2>Cảm ơn bạn</h2><p>Yêu cầu đã được ghi nhận.</p></section>');
}

export function renderLookup(slug: string, status: LookupStatus | null, error = ''): string {
  const form = `<section><h2>Tra cứu đăng ký</h2><form method="get" action="/api/dscTournament:page" accept-charset="utf-8"><input type="hidden" name="slug" value="${esc(slug)}"><input type="hidden" name="xem" value="tra-cuu">
<label for="ma">Mã đăng ký (vd GD00012)</label><input id="ma" name="ma" maxlength="12" required><label for="sdt">Số điện thoại đã đăng ký</label><input id="sdt" name="sdt" type="tel" inputmode="tel" maxlength="20" required>
<button class="btn" type="submit">Tra cứu</button></form></section>`;
  let result = '';
  if (error) {
    result = `<section role="alert"><p class="err">${esc(error)}</p></section>`;
  } else if (status) {
    result = `<section role="status"><h2>${esc(status.ma_dang_ky)}</h2><p>Trạng thái: <strong class="${status.trang_thai === 'da_xac_nhan' ? 'ok' : 'warn'}">${esc(PLAYER_TEXT[status.trang_thai] ?? status.trang_thai)}</strong></p>
<p>Lệ phí: ${esc(money(status.le_phi))} · Đã nhận: ${esc(money(status.da_thu))}${status.con_thieu > 0 ? ` · Còn thiếu: <strong>${esc(money(status.con_thieu))}</strong>` : ''}</p>${
      status.con_thieu > 0 ? `<p class="muted">Nội dung chuyển khoản: <strong>${esc(transferContent(status.ma_dang_ky))}</strong></p>` : ''
    }</section>`;
  }
  return layout('Tra cứu đăng ký', `${nav({ slug, trang_thai: '' })}${form}${result}`);
}

export function renderStandings(model: StandingsView): string {
  const sections = model.bang
    .map((b) => {
      const rows = b.xep_hang
        .map(
          (r) =>
            `<tr><td class="num">${esc(r.hang)}</td><td>${esc(r.ten)}</td><td class="num">${esc(r.nam_sinh ?? '')}</td><td>${esc(r.clb ?? '')}</td><td class="num"><strong>${esc(r.diem)}</strong></td><td class="num">${esc(r.buchholz_cat1)}</td><td class="num">${esc(r.buchholz)}</td><td class="num">${esc(r.so_thang)}</td></tr>`,
        )
        .join('');
      return `<section><h2>${esc(b.ten)}</h2><div class="wrap"><table><caption class="muted">Sau vòng ${esc(b.vong_hien_tai)}${b.so_vong ? ` / ${esc(b.so_vong)}` : ''}</caption><thead><tr><th scope="col" class="num">Hạng</th><th scope="col">Kỳ thủ</th><th scope="col" class="num">Sinh</th><th scope="col">CLB</th><th scope="col" class="num">Điểm</th><th scope="col" class="num">Bch-1</th><th scope="col" class="num">Bch</th><th scope="col" class="num">Thắng</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Chưa có kết quả.</td></tr>'}</tbody></table></div></section>`;
    })
    .join('');
  return layout(`Bảng xếp hạng — ${model.giai.ten}`, `${nav(model.giai)}${sections}<p class="muted">Bch-1: Buchholz cắt 1; Bch: Buchholz.</p>`);
}

export function renderPairings(model: PairingsView): string {
  const sections = model.bang
    .map((b) => {
      const rows = b.van_dau
        .map(
          (g) =>
            `<tr><td class="num">${esc(g.ban)}</td><td>${esc(g.trang)}</td><td>${g.den === null ? '<span class="muted">(nghỉ — bye)</span>' : esc(g.den)}</td><td>${esc(g.ket_qua === 'chua_co' ? '' : g.ket_qua)}</td></tr>`,
        )
        .join('');
      return `<section><h2>${esc(b.ten)} — vòng ${esc(b.vong)}</h2><div class="wrap"><table><thead><tr><th scope="col" class="num">Bàn</th><th scope="col">Trắng</th><th scope="col">Đen</th><th scope="col">Kết quả</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Vòng này chưa được công bố.</td></tr>'}</tbody></table></div></section>`;
    })
    .join('');
  return layout(`Cặp đấu — ${model.giai.ten}`, `${nav(model.giai)}${sections}`);
}

export function renderError(status: number, message: string): string {
  return layout(status === 404 ? 'Không tìm thấy' : 'Không thực hiện được', `<section role="alert"><p class="err">${esc(message)}</p></section>`);
}

const PRIVATE_IP = /^(::1$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::ffff:(127|10|192\.168|172\.(1[6-9]|2\d|3[01]))\.|f[cd][0-9a-f]{2}:|fe80:)/i;

/** IP thật của khách: chỉ tin X-Forwarded-For khi kết nối trực tiếp đến từ proxy nội bộ; duyệt từ phải sang trái, bỏ qua các chặng nội bộ (nhiều proxy nối tiếp) và lấy địa chỉ công khai đầu tiên. */
export function clientIpOf(direct: string | undefined, forwarded: string | undefined): string {
  const peer = direct || 'unknown';
  if (!PRIVATE_IP.test(peer)) return peer;
  const hops = (forwarded ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  for (let i = hops.length - 1; i >= 0; i -= 1) {
    if (!PRIVATE_IP.test(hops[i])) return hops[i];
  }
  return hops.length ? hops[hops.length - 1] : peer;
}
