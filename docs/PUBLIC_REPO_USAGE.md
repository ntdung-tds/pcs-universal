# Sử dụng PCS bằng GitHub công khai — không cần tải ZIP

1. Mở trang chủ repo, bấm [`PROMPT.md`](../PROMPT.md).
2. Sao chép **Prompt chuẩn**; dán vào ChatGPT, Claude, Gemini hoặc agent phù hợp.
3. Gửi SRS/SOW/đề cương hoặc mô tả yêu cầu. AI đọc `START_HERE.md`, rồi tự tìm hiểu và thực hiện theo công cụ và quyền thực tế.
4. Simple Mode (mặc định): AI tự tạo hoặc tiếp tục **repo dự án riêng tư**, ghi `pcs/STATE.json`, `pcs/MOMENT.md`, Issues liên quan, không cần chạy setup trong Handbook. Google Drive là tùy chọn cho tài liệu và media.
5. Nếu AI không có công cụ ghi GitHub/Drive, AI được tiếp tục các việc không phụ thuộc nhưng phải báo chưa lưu/thiếu quyền. Không coi chỉ đọc trang GitHub công khai là đủ để xây, chạy hoặc triển khai hệ thống.

**Lưu ý bảo mật:** Kho `pcs-universal` là công khai và chỉ dành cho PCS. Không đăng SRS nội bộ, kết quả dự án, credential hoặc tài liệu cá nhân tại đây. Mọi tính năng Inbox/Gateway là nâng cao và cần triển khai riêng khi có nhu cầu thật.

**Không tự chạy GitHub Inbox trong chế độ Simple Mode.** Các file cấu hình Inbox/Gateway chỉ là công cụ nâng cao, không phải điều kiện để giao SRS.
