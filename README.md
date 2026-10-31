# PCS — Universal AI Project System

**Phiên bản công khai:** PCS 3.0.2 · **Dành cho:** ChatGPT, Claude, Gemini, Codex, Claude Code, Cursor và các AI có công cụ phù hợp.

> **Cách sử dụng:** Mở **[PROMPT.md](PROMPT.md)** → sao chép prompt → dán vào ChatGPT/Claude/Gemini → đính kèm SRS, SOW, đề cương, hoặc chỉ mô tả ý tưởng. **Không cần tải hoặc cài PCS bằng tay cho mỗi dự án.**

**[📋 XEM VÀ SAO CHÉP PROMPT](PROMPT.md)** · [Dành cho AI: bắt đầu tại đây](START_HERE.md) · [Hướng dẫn chi tiết](docs/ONE_SENTENCE_WORKFLOW.md)

## Bắt đầu trong 3 bước

1. Vào **[PROMPT.md](PROMPT.md)** và sao chép đoạn **“Prompt chuẩn”**.
2. Mở ứng dụng AI bạn dùng, dán prompt và cung cấp yêu cầu / file SRS / SOW nếu có.
3. AI đọc **[START_HERE.md](START_HERE.md)** và các tài liệu liên quan từ repository này, tự kiểm tra khả năng GitHub/Google Drive, chủ động thực hiện, kiểm thử và lưu trạng thái **khi thực sự có quyền ghi**.

**Repo này là bộ tiêu chuẩn/công cụ PCS công khai, không phải nơi lưu dự án của bạn.** Mỗi dự án sử dụng repository GitHub **private mặc định**, không lưu mật khẩu, API key, dữ liệu riêng tư hoặc tài liệu nội bộ vào repo công khai. Google Drive dùng cho tài liệu/hình ảnh khi kết nối; nếu không dùng được thì GitHub là nơi lưu thay thế **với điều kiện phân loại dữ liệu cho phép**.

## PCS giúp AI làm gì?

- Hiểu mục tiêu và yêu cầu; xác định thiếu sót/mâu thuẫn, nghiên cứu khi cần.
- Xây Product Map, Architecture Map, các luồng người dùng và phụ thuộc xuyên phân hệ.
- Lập kế hoạch, thực hiện công việc, kiểm thử từ task đến feature, business flow và release.
- Lưu bằng chứng, quyết định, tiến độ và **PCS Moment** để tiếp tục giữa các phiên hoặc chuyển AI.
- Tự lựa chọn phương pháp phù hợp; không áp đặt stack, token budget hoặc checklist máy móc.
- Phân biệt rõ **đã thực hiện**, **đã kiểm chứng**, **đã lưu GitHub** và **chưa có quyền/đang bị chặn**.

## Khả năng thực tế và bảo mật

Repo công khai này **không tự cấp quyền** cho AI chạy mã, clone, tạo GitHub repository, ghi Google Drive, chạy kiểm thử hoặc triển khai. AI phải kiểm tra công cụ được cấp trong từng phiên. Nếu chỉ có quyền đọc, AI có thể phân tích và chuẩn bị sản phẩm nhưng phải báo rõ `PERSISTENCE_BLOCKED` khi không ghi được. Không giả mạo kết quả kiểm thử/triển khai.

**Quan trọng:** Các workflow vận hành Inbox dành cho kho nhận yêu cầu riêng tư được để trong `templates/private-intake/`, **không tự chạy trên repo công khai này**. Khi triển khai môi trường riêng, cần cấu hình quyền và kiểm thử E2E thực tế; xem [tài liệu nâng cao](docs/GITHUB_INBOX_MODE.md).

## Tài liệu và mã nguồn

| Thành phần | Đường dẫn |
|---|---|
| Prompt để copy | [`PROMPT.md`](PROMPT.md) |
| AI bắt đầu | [`START_HERE.md`](START_HERE.md) |
| Nguyên tắc chung | [`adapters/UNIVERSAL_INSTRUCTIONS.md`](adapters/UNIVERSAL_INSTRUCTIONS.md) |
| Kiến trúc/lưu trữ | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/STORAGE_POLICY.md`](docs/STORAGE_POLICY.md) |
| Bảo mật | [`SECURITY.md`](SECURITY.md), [`docs/DATA_CLASSIFICATION.md`](docs/DATA_CLASSIFICATION.md) |
| CLI / code mẫu | [`runtime/`](runtime/) |
| Kiểm thử, giới hạn | [`TEST_REPORT.md`](TEST_REPORT.md) |
| Hướng dẫn advanced | [`docs/`](docs/) |

**Trạng thái:** PCS 3.0.2 đã kiểm thử cục bộ theo `TEST_REPORT.md`, nhưng **chưa chứng nhận quy trình end-to-end trên mọi nền tảng AI hoặc tài khoản GitHub cụ thể**.

**Quyền sử dụng lại:** Repo đang công khai để đọc và tham khảo. Chưa gắn giấy phép mã nguồn mở; chủ sở hữu cần quyết định giấy phép nếu muốn cho phép bên khác tái sử dụng/phân phối rộng rãi.
