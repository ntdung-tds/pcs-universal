# PCS — Universal AI Project System

**Phiên bản công khai:** PCS 3.2.0 — Lean Contributor Management · **Dành cho:** ChatGPT, Claude, Gemini, Codex, Claude Code, Cursor và các AI có công cụ phù hợp.

> **Cách sử dụng:** Mở **[PROMPT.md](PROMPT.md)** → sao chép prompt → dán vào ChatGPT/Claude/Gemini → đính kèm SRS, SOW, đề cương, hoặc chỉ mô tả ý tưởng. **Không cần tải hoặc cài PCS bằng tay cho mỗi dự án.**

**[📋 SAO CHÉP PROMPT](PROMPT.md)** · **[PCS Lean 3.2](docs/PCS_3_2_LEAN.md)** · [Dành cho AI](START_HERE.md) · [Advanced legacy](docs/INSTALL_AND_ACTIVATE.md)

**Cập nhật bảo mật 01/11/2026:** Đã vá lỗi phê duyệt rủi ro, bằng chứng bị thay đổi và quyền Lead hết hạn; bổ sung PR chờ review khi nhánh chính được bảo vệ. [Chi tiết và giới hạn còn lại](docs/GOVERNANCE_HARDENING_20261101.md). Chưa chứng nhận E2E giữa các AI trên repository dự án thật.

**Mới trong PCS 3.1.1:** Lead Agent tự kiểm tra rulesets và bảo vệ nhánh mặc định; nếu chưa được bảo vệ, Lead lập phương án và chỉ áp dụng bằng quyền Admin riêng sau khi Owner xác nhận có chứng cứ. Không yêu cầu người dùng tự thiết lập từng tùy chọn. [Hướng dẫn Branch Governance](docs/BRANCH_GOVERNANCE.md).

## Bắt đầu trong 3 bước

1. Vào **[PROMPT.md](PROMPT.md)** và sao chép đoạn **“Prompt chuẩn”**.
2. Mở ứng dụng AI bạn dùng, dán prompt và cung cấp yêu cầu / file SRS / SOW nếu có.
3. AI đọc **[START_HERE.md](START_HERE.md)** và các tài liệu liên quan từ repository này, tự kiểm tra khả năng GitHub/Google Drive, chủ động thực hiện, kiểm thử và lưu trạng thái **khi thực sự có quyền ghi**.

**Repo này là bộ tiêu chuẩn/công cụ PCS công khai, không phải nơi lưu dự án của bạn.** Mỗi dự án sử dụng repository GitHub **private mặc định**, không lưu mật khẩu, API key, dữ liệu riêng tư hoặc tài liệu nội bộ vào repo công khai. Google Drive dùng cho tài liệu/hình ảnh khi kết nối; nếu không dùng được thì GitHub là nơi lưu thay thế **với điều kiện phân loại dữ liệu cho phép**.

## Một quy trình duy nhất cho người sử dụng

AI tự khởi tạo repository dự án **private**, lưu `pcs/STATE.json` và `pcs/MOMENT.md`, quản lý task/feature/flow/release và GitHub Issues. Khi agent mới đến, PCS đăng ký và phê duyệt quyền tham gia **một lần trong cùng trạng thái**; task bình thường đủ điều kiện có thể tự nhận nếu policy đã cho phép. Không phải chọn chế độ hay chuyển hệ dữ liệu chỉ vì tăng số agent. **Không cần cài GitHub App, Inbox, Gateway hoặc chạy CLI** để bắt đầu. GitHub Projects vẫn tùy chọn. [Xem quy trình](docs/SIMPLE_MODE.md).

Những hạ tầng như GitHub Inbox, Gateway và chuỗi event nâng cao là **thành phần kỹ thuật tùy chọn** cho các tình huống cần mức giao dịch/kiểm toán cao; không tự kích hoạt hoặc thay đổi nguồn trạng thái chuẩn. Handbook mô tả triển khai hạ tầng này, không phải checklist bắt buộc. Các dự án cũ đã dùng canonical HEAD riêng cần migration có kiểm chứng trước khi thống nhất.

## PCS 3.2: One Lead, Lean Contributors, Owner kiểm soát kết quả

**Mới trong 3.2:** Chỉ cần duyệt tư cách tham gia một lần. Contributor đã được duyệt, có GitHub identity độc lập và đang rảnh có thể **tự nhận task LOW/NORMAL**, không có người nhận, đủ dependency và được bật trong policy. Lead tiếp tục điều phối/review; Owner chủ yếu nghiệm thu feature/milestone/release và duyệt hành động nhạy cảm. Mọi cấp đều dùng một `pcs/STATE.json`. **Đây không phải dịch vụ tự chạy đa AI; E2E chưa chứng nhận.** [Xem quy trình đầy đủ](docs/PCS_3_2_LEAN.md).

## Một Lead Agent, nhiều Contributor và Owner nghiệm thu kết quả

- Mặc định chỉ **một AI** làm việc; không cần tạo thêm agent.
- Khi agent mới xin tham gia, có thể **tự đề xuất task**, nhận phân công từ Lead hoặc chỉ định từ **chủ dự án**.
- **Bạn hoặc Lead đã được bạn ủy quyền đều được duyệt tư cách tham gia và đề xuất công việc thông thường.** Agent đã được duyệt có thể tự nhận task LOW/NORMAL đủ điều kiện, không xin phép mỗi lần. Công việc nhạy cảm phải do bạn phê duyệt.
- Các agent cùng dùng `pcs/STATE.json`, branch/PR riêng, lưu Moment; danh tính và phê duyệt phải được xác minh qua GitHub.
- **Lead Agent nghiệm thu kỹ thuật:** review mã, xác minh PR/CI, chấp nhận task và chủ động đề xuất/giao việc tiếp theo trong phạm vi ủy quyền.
- **Bạn nghiệm thu trải nghiệm sản phẩm:** xem bản chạy thật, tài liệu hoặc hình ảnh rồi nói “Đồng ý”, “Cần chỉnh sửa”, “Không đồng ý”. Không yêu cầu bạn kiểm tra code hoặc chạy test.
- Phản hồi trong chat giúp Lead điều chỉnh nhưng không bị tự nhận là phê duyệt GitHub/production; các quyết định có yêu cầu kiểm toán phải được xác thực riêng.
- Không tự kích hoạt workflow/hạ tầng mới chỉ vì có nhiều agent; nếu cần cấp quyền, AI yêu cầu đúng lúc.

[**Xem PCS Lean 3.2 — quyền và hai cấp nghiệm thu**](docs/PCS_3_2_LEAN.md) · [**Hướng dẫn quản lý nhiều agent**](docs/AGENT_COLLABORATION.md) · [**Prompt cho agent mới**](PROMPT.md#prompt-agent-mới-xin-tham-gia-không-cố-định-nhiệm-vụ)

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
| Tự bảo vệ nhánh theo Owner consent | [`docs/BRANCH_GOVERNANCE.md`](docs/BRANCH_GOVERNANCE.md), [`tools/pcs-branch-guard.mjs`](tools/pcs-branch-guard.mjs) |
| Cộng tác agent/duyệt | [`docs/PCS_3_1_UNIFIED.md`](docs/PCS_3_1_UNIFIED.md), [`docs/AGENT_COLLABORATION.md`](docs/AGENT_COLLABORATION.md), [`runtime/pcs3-delivery.mjs`](runtime/pcs3-delivery.mjs) |
| Quản lý contributor tinh gọn | [`docs/PCS_3_2_LEAN.md`](docs/PCS_3_2_LEAN.md), [`runtime/pcs3-lean.mjs`](runtime/pcs3-lean.mjs) |
| Simple Mode và quản trị | [`docs/SIMPLE_MODE.md`](docs/SIMPLE_MODE.md), [`docs/SIMPLE_MODE_QUALITY.md`](docs/SIMPLE_MODE_QUALITY.md) |
| CLI / code mẫu | [`runtime/`](runtime/) |
| Kiểm thử, giới hạn | [`TEST_REPORT.md`](TEST_REPORT.md) |
| Hướng dẫn advanced | [`docs/`](docs/) |

**Trạng thái:** PCS 3.2.0 kế thừa 3.1.1 và bổ sung kiểm thử hồi quy tự động và kiểm tra toàn vẹn gói; xem kết quả GitHub Actions và `TEST_REPORT.md`, nhưng **chưa chứng nhận quy trình end-to-end trên mọi nền tảng AI hoặc tài khoản GitHub cụ thể**.

**Quyền sử dụng lại:** Repo đang công khai để đọc và tham khảo. Chưa gắn giấy phép mã nguồn mở; chủ sở hữu cần quyết định giấy phép nếu muốn cho phép bên khác tái sử dụng/phân phối rộng rãi.
