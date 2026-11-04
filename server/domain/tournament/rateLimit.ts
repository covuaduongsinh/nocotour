// Giới hạn tần suất theo IP trong bộ nhớ cho trang công khai / đăng ký / tra cứu (chuyển từ v2 plugin.ts: `limited`, `exceeded`, `record`).
// Khác v2: thời gian nhận qua `now()` (v2 gọi `Date.now()` trực tiếp) để test được; thuật toán, ngưỡng và dọn bộ nhớ giữ nguyên.

import { TournamentError } from './errors.js';

// Ngưỡng của v2 plugin.ts (giữ nguyên): action công khai 60 lần/phút; trang công khai 60 lần/phút (xô 'page');
// tra cứu 10 lần/phút (xô 'status'); đăng ký mặc định 5 lần/10 phút (xô 'register', đổi bằng biến môi trường ở tầng route).
export const PUBLIC_LIMIT = 60;
export const PUBLIC_WINDOW_MS = 60 * 1000;
export const PAGE_LIMIT = 60;
export const PAGE_WINDOW_MS = 60 * 1000;
export const STATUS_LIMIT = 10;
export const STATUS_WINDOW_MS = 60 * 1000;
export const REGISTER_LIMIT_DEFAULT = 5;
export const REGISTER_WINDOW_MS = 10 * 60 * 1000;
const MAX_KEYS = 5000;

// Chuỗi lỗi 429 nguyên văn từ v2.
export const MSG_TOO_MANY_REQUESTS = 'Quá nhiều yêu cầu, thử lại sau ít phút';
export const MSG_TOO_MANY_LOOKUPS = 'Tra cứu quá nhiều lần, thử lại sau ít phút';
export const MSG_TOO_MANY_REGISTRATIONS = 'Bạn đã gửi quá nhiều đăng ký, thử lại sau ít phút';

/** Giới hạn đăng ký từ giá trị cấu hình (v2: `Number(process.env.DSC_TOURNAMENT_REGISTER_LIMIT) > 0 ? … : 5`). Đọc biến môi trường là việc của tầng route. */
export function registerLimitFrom(value: unknown): number {
  const n = Number(value);
  return n > 0 ? n : REGISTER_LIMIT_DEFAULT;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Ghi một lần gọi và trả `true` nếu đã vượt `max` trong `windowMs`. */
  limited(ip: string, bucket = 'public', max = PUBLIC_LIMIT, windowMs = PUBLIC_WINDOW_MS): boolean {
    const now = this.now();
    const key = `${bucket}|${ip}`;
    const recent = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs);
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > MAX_KEYS) {
      for (const [other, times] of this.hits) {
        if (!times.some((time) => now - time < Math.max(windowMs, PUBLIC_WINDOW_MS))) {
          this.hits.delete(other);
        }
      }
    }
    return recent.length > max;
  }

  /** Đã chạm giới hạn chưa (KHÔNG ghi thêm một lần gọi). */
  exceeded(ip: string, bucket: string, max: number, windowMs: number): boolean {
    const now = this.now();
    return (this.hits.get(`${bucket}|${ip}`) ?? []).filter((time) => now - time < windowMs).length >= max;
  }

  record(ip: string, bucket: string): void {
    const key = `${bucket}|${ip}`;
    this.hits.set(key, [...(this.hits.get(key) ?? []), this.now()]);
  }

  /** Số khoá đang giữ (để test dọn bộ nhớ). */
  get size(): number {
    return this.hits.size;
  }
}

/**
 * `guard` cho `registerPlayer` (v2 plugin.ts `registerAction`): chạy SAU khi dữ liệu đã hợp lệ và TRƯỚC khi tạo bản ghi.
 * Chỉ khi chưa chạm ngưỡng mới ghi một lần đăng ký; chạm ngưỡng thì ném 429 và không ghi thêm.
 */
export function registerGuard(limiter: RateLimiter, ip: string, limit: number = REGISTER_LIMIT_DEFAULT): () => void {
  return () => {
    if (limiter.exceeded(ip, 'register', limit, REGISTER_WINDOW_MS)) {
      throw new TournamentError(429, MSG_TOO_MANY_REGISTRATIONS);
    }
    limiter.record(ip, 'register');
  };
}
