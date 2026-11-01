> **Dùng mặc định:** [PROMPT.md](PROMPT.md), chế độ Simple tại [docs/SIMPLE_MODE.md](docs/SIMPLE_MODE.md). Không yêu cầu người dùng cài backend theo Handbook để bắt đầu.

# Prompt đơn giản cho ChatGPT / Claude / Gemini

**Sau khi kết nối GitHub và gắn hướng dẫn PCS3 vào AI app:**

> Hãy triển khai dự án này theo tài liệu tôi cung cấp. Tự phân tích và chủ động thực hiện trong phạm vi quyền đang có. Dùng GitHub làm nguồn dữ liệu dự án chính, Google Drive khi khả dụng và fallback toàn bộ sang GitHub khi Drive lỗi. Ghi checkpoint và bằng chứng xác thực để AI khác có thể tiếp tục. Chỉ hỏi tôi những quyết định quan trọng.

**Về sau:**

> Tiếp tục dự án theo PCS, sử dụng trạng thái mới nhất trên GitHub.

Một câu nhắn ngắn hơn như **“Hãy làm dự án này”** vẫn là tín hiệu hợp lệ để agent bắt đầu quy trình, khi nó đã có quyền và cấu hình.

Nếu phát hiện agent khác đang muốn tham gia, đọc `docs/AGENT_COLLABORATION.md`. Agent có thể tự đề xuất hoặc xin gia nhập khi chưa có task; chỉ Owner hoặc Lead được Owner ủy quyền mới duyệt, quyết định phải có chứng cứ GitHub Issue/comment và ghi chung `pcs/STATE.json`.
