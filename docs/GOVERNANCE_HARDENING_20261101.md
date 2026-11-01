# PCS Agent Governance Hardening — 01/11/2026

## Phạm vi bản nâng cấp

Sửa các lỗi logic đã được kiểm toán tại commit `503708a7` và bổ sung kiểm thử phản ví dụ vào CI. Đây là bản tăng cường bảo mật cho PCS Dynamic Agent Collaboration trong **cùng `pcs/STATE.json`**; không tự động đổi schema hoặc tạo repo thứ hai.

| Audit ID | Tình trạng sau sửa | Bảo đảm |
| --- | --- | --- |
| SEC-01 / P0 | Đã vá và thêm test | Lead không được duyệt task `high`, không rõ phân loại, hoặc nhạy cảm. Không tin vào nhãn NORMAL của đề xuất. |
| SEC-02 / P0 | Đã vá và thêm test | Object bằng chứng bất biến; ràng buộc digest, đối tượng state, toàn bộ snapshot trạng thái, actor, task, action, comment. |
| SEC-03 / P0 | Đã vá và thêm test | Kiểm tra quyền Lead/epoch/expiry tại thời điểm áp dụng; quyết định cũ sau revoke/replace bị từ chối. |
| SEC-04 / P1 | Tăng kiểm tra cấu trúc | Kiểm tra epoch và provenance theo owner trong state. Không đủ để bảo đảm khi kẻ có toàn quyền GitHub tự sửa state. |
| REL-02 / P1 | Đã có PR fallback | Bị chặn push nhánh mặc định HTTP 403 thì đề xuất PR, kết quả `REVIEW_REQUIRED`, không tự merge. |

## Chưa đạt và không được che giấu

- **SEC-05 / SEC-06:** GitHub login/token dùng chung giữa Owner và agent không chứng minh phê duyệt của con người; nếu agent có quyền ghi trực tiếp lên main thì vẫn có thể bỏ qua validator. Cần identity/principal tách biệt và branch rules trên repo dự án.
- **REL-01:** chưa có hệ thống liên tục giám sát Issue mới và kích hoạt một agent ở cửa sổ chat độc lập. Phải có agent/công cụ đang chạy, hoặc người dùng chủ động mở lại.
- **GOV-01:** Simple/Advanced schema lịch sử chưa migration/hợp nhất hoàn toàn; không được ghi hai canonical state cho cùng dự án.
- **QA-01:** `ACCEPTED` có thể đúng cấu trúc mà chưa có nguồn CI, test và con người độc lập chứng thực; phải đối chiếu thật.
- **GOV-02:** thu hồi state chưa thu hồi GitHub token hoặc mọi branch/PR đang dở. Cần kiểm tra handoff và quyền thực.
- **OPS-01:** repository public chưa tự xác định giấy phép tái sử dụng.

## Quy trình quyết định

1. Agent mới mở Issue có marker join; operator xác nhận Issue, lưu proposal PENDING.
2. Owner hoặc Lead được ủy quyền bình luận lệnh PCS trên Issue; danh tính tác giả được đọc qua GitHub API, không tin lời tự khai.
3. Thực thi xem xét lại risk task thực, phiên quyền Lead và trạng thái bất biến. Không hợp lệ → từ chối; dữ liệu không rõ → Owner-only.
4. Khi có quyền push → `APPLIED` sau khi đọc lại HEAD; nếu được chặn bởi protected branch → mở PR `REVIEW_REQUIRED` và chưa coi là phê duyệt.
5. Sau khi PR được review/merge, operator/agent phải đọc lại state mới nhất và xác minh, rồi mới giao quyền/nhiệm vụ.

## Tiêu chí nghiệm thu còn mở

Cần E2E thật trên repository private với hai GitHub principals tách biệt, rulesets/branch protection, owner duyệt và Lead duyệt đúng phạm vi, 3 agent xử lý cạnh tranh, PR protected branch, hồi phục agent mất kết nối và ChatGPT ↔ Claude. Mock và GitHub CI của repo PCS không chứng minh các điều kiện đó.

**Nguyên tắc vận hành:** một agent vẫn dùng được mà không cần coordinator; nhiều agent chỉ được kích hoạt khi điều kiện GitHub permissions và identity thực tế đã được kiểm chứng.
