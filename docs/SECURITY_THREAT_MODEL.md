# PCS 3.0.1 — Threat model GitHub + Code + AI

## Tài sản cần bảo vệ

1. Quyền truy cập tài khoản GitHub/Google Drive, token, khóa ký, khóa mã hóa.
2. Source code, SRS, log kiểm thử, checkpoint PCS, dữ liệu đính kèm.
3. Quyền phê duyệt, kết quả test, lịch sử thay đổi và nguồn gốc sự kiện.
4. Pipeline GitHub Actions, dependency và môi trường production.

| Rủi ro | Biện pháp được cài trong bản 3.0.1 | Cần quản trị ngoài code |
|---|---|---|
| Lộ bí mật trong trạng thái/artifact | Scanner chặn một số credential trước khi ghi | Secret scanning + push protection của GitHub, review, xoay vòng |
| Sao lưu tài liệu mật nguyên bản | Mã hóa authenticated AES-256-GCM cho `CONFIDENTIAL` | Giữ khóa bằng secret manager, chính sách pháp lý và phân quyền |
| Nhầm repository công khai | Kiểm tra repository visibility và data classification khi init, artifact **và checkpoint**; Public là lựa chọn có điều kiện | Thiết lập private, cấm đổi visibility trái phép |
| Agent giả mạo nghiệm thu | Inbox không được thêm/sửa approvals và không được chuyển trạng thái sang `ACCEPTED` | Approval xác thực qua PR/Code Owner/quy trình người có thẩm quyền |
| Ghi đè giữa các agent | CAS theo revision/sha và snapshot | Branch protection, kiểm tra conflict, nhật ký audit |
| Prompt injection trong SRS/Issue/Drive | Quy tắc nguồn không tin cậy, permissions logic, không thực thi input như lệnh | Giáo dục và review workflow hành động rủi ro cao |
| GitHub Actions supply-chain | SHA pin actions, tối thiểu `GITHUB_TOKEN`, cache/credentials không mặc định lưu | Rulesets/branch protection, kiểm soát người có quyền chỉnh workflow |
| Mã nguồn web/API có lỗ hổng | Quy tắc secure coding và test gate | SAST/DAST/CodeQL phù hợp, pentest theo rủi ro |
| Lộ dữ liệu qua Gateway | Localhost mặc định; phản hồi 500 không in raw upstream lỗi | TLS, OAuth/RBAC, audit, rate limiting, WAF nếu public |
| Không thể khôi phục/forensic | Event chain, checksum artifact, audit | Backup ngoài cùng trust zone, khôi phục diễn tập, retention |

## Ưu tiên GitHub bắt buộc (cấu hình qua GitHub, không thể bật chỉ bằng ZIP)

- Repository **Private hoặc Public tùy dữ liệu/Owner** (Public phải qua kiểm soát trong `docs/STATE_OPERATIONS.md`), tổ chức bật 2FA/MFA, người dùng/agent quyền tối thiểu, token có hạn sử dụng và scope riêng từng repo. Không đưa PAT vào chat.
- Bảo vệ nhánh chính: PR review, required checks, hạn chế force push, xóa branch, bypass, xem xét CODEOWNERS cho `runtime/`, `.github/`, `SECURITY.md`.
- Bật Dependabot alerts & security updates, Secret scanning & push protection, Code scanning/CodeQL nếu gói GitHub hỗ trợ. Tính năng cho **private repo có thể phụ thuộc license**. Không được ghi là đã bật nếu chưa kiểm tra UI/REST thật.
- Không chạy mã từ PR không tin cậy bằng token ghi; inbox hiện dùng push workflow với `contents: write` để ghi HEAD, **chỉ cho phép từ nhánh mặc định được bảo vệ**. Thành viên có quyền sửa workflow/core trên nhánh đó có thể thay đổi toàn bộ logic, nên cần GitHub Rulesets và review bằng người có thẩm quyền trước khi cho vận hành thật.
- Gắn identity của actor với log provider thay vì tin `actor` trong JSON; chatbot-generated `APPROVED` chỉ là lời khai. PCS Inbox 3.0.1 chặn một số đường ghi approval nhưng không thay được xác thực danh tính doanh nghiệp.

## Coding security baseline (theo rủi ro)

- Model quyền server-side, deny-by-default, kiểm thử quyền theo role và tenant; không tin UI đã ẩn nút là đã có quyền.
- Kiểm tra và giới hạn dữ liệu đầu vào; query tham số hóa, chống XSS/SSRF/CSRF theo kiến trúc; kiểm soát upload nội dung, định dạng, kích thước, malware; giới hạn log PII.
- Không hardcode credential; chọn thư viện đáng tin, lockfile, theo dõi lỗ hổng supply chain; phân biệt lỗi nhận biết với lỗi bảo mật cần kiểm chứng.
- Test negative, integration, regression và các luồng auth/upload/tenant đặc biệt. **Không hạ rủi ro xuống thấp chỉ vì AI tự báo PASS.**
- Production: yêu cầu authority thực và bằng chứng nghiệm thu, rollback, backup; không mở write Access token từ chat trực tiếp tới production.

Tham khảo: GitHub Docs https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats ; https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository ; OWASP Secure Coding with AI https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_with_AI_Cheat_Sheet.html ; OWASP ASVS https://owasp.org/projects/asvs .
