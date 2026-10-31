# Ví dụ triển khai private intake

Workflow `pcs3-inbox.yml` được giữ dưới thư mục này để KHÔNG tự chạy trong repository PCS công khai. Chỉ sau khi có repository private phù hợp, quyền GitHub App được kiểm tra, và đã đọc `docs/GITHUB_INBOX_MODE.md` mới sao chép file workflow vào `.github/workflows/pcs3-inbox.yml` ở **repository intake riêng**.

Không đưa SRS, mật khẩu, khóa riêng hoặc dữ liệu nội bộ vào repository PCS công khai.
