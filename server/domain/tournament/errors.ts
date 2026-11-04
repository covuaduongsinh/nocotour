// Lỗi nghiệp vụ của mảng giải đấu: mang mã HTTP để lớp route (server/routes/) đổi sang ApiError.
// v2 gọi là `HttpError` (plugins/plugin-dsc-tournament/src/server/service.ts); v3 đổi tên cho rõ mảng, cùng hành vi.

export class TournamentError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'TournamentError';
    this.status = status;
  }
}
