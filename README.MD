# NocoEdu - Hệ thống Quản trị Giảng dạy, Điểm danh & Cấp chứng chỉ

NocoEdu là phân hệ quản lý học vụ và đào tạo chuyên sâu trong hệ sinh thái số của Công ty Cổ phần Cờ vua Dương Sinh (DSC), được phát triển trên nền tảng NocoBase 3 (Code-first, Modular, Full TypeScript, Node.js 24).

## 1. Vai trò trong Hệ sinh thái Dương Sinh Chess

- **NocoBase Core** (`nocobase.dsc.edu.vn`): Nền tảng hạt nhân, xác thực tập trung và quản trị hệ thống.
- **NocoCRM** (`nococrm.dsc.edu.vn`): Tuyển sinh, tiếp nhận Lead, hồ sơ Phụ huynh, thu học phí và CSKH.
- **NocoEdu** (`nocoedu.dsc.edu.vn`): Quản lý Khóa học, Lớp học, Lịch học, Điểm danh 1 chạm, Trừ số buổi tự động (F0–F7) và Cấp chứng chỉ A4 PDF (Typst).

## 2. Các chức năng chính

1. **Khóa học & Lớp học**: Quản lý chương trình đào tạo từ Nhập môn đến Nâng cao/Đội tuyển theo từng cơ sở và lớp học online.
2. **Điểm danh 1 chạm (Attendance)**: Giao diện tối ưu cho giáo viên điểm danh nhanh trên di động hoặc máy tính bảng (Có mặt, Nghỉ có phép, Nghỉ không phép, Đi muộn).
3. **Bộ máy tính toán trừ buổi học**: Tự động khấu trừ buổi học theo quy tắc nghiệp vụ, tự động cảnh báo phụ huynh khi số buổi học còn lại <= 3 buổi.
4. **Cấp chứng chỉ A4**: Tích hợp công nghệ Typst xuất PDF chứng chỉ tốt nghiệp khóa học chuyên nghiệp, có mã tra cứu định danh.

## 3. Cài đặt & Phát triển

```bash
# Cài đặt phụ thuộc
pnpm install

# Khởi chạy môi trường phát triển
pnpm dev

# Xây dựng bản phân phối production
pnpm build
```
