# PCS 3.1.1 — Lead tự bảo vệ nhánh GitHub

**Mục tiêu:** Project Owner không cần tự cấu hình GitHub rulesets. Lead tự kiểm tra, lập kế hoạch, sau đó áp dụng nếu có công cụ quản trị và phê duyệt Owner độc lập.

## Quy trình mặc định

1. **Lead kiểm tra chỉ đọc:** repository, nhánh mặc định (không giả định luôn là main), HEAD commit, ruleset, effective rules và classic branch protection.
2. **Tôn trọng cấu hình có sẵn:** nếu đủ bảo vệ -> ALREADY_PROTECTED. Nếu có quy tắc hiện hữu/partial -> EXISTING_POLICY_REVIEW. Không đọc được -> INSPECTION_BLOCKED. Không tự ghi đè.
3. **Lập kế hoạch:** chỉ khi hoàn toàn quan sát được rằng chưa có quy tắc, tool trả OWNER_APPROVAL_REQUIRED kèm SHA-256 ràng buộc repo, nhánh, HEAD, rulesets và policy đề xuất.
4. **Owner xác nhận:** chính Owner dùng tài khoản GitHub độc lập với agent để bình luận trên Issue, đúng lệnh phê duyệt mang SHA kế hoạch.
5. **Lead áp dụng:** có token quyền Administration:write riêng cho repository đó, không dùng chung token Owner. Lead gọi API tạo ruleset mới, không xóa/giảm/bypass quy tắc cũ.
6. **Xác minh:** đọc lại ruleset và effective rules. Chỉ báo APPLIED_VERIFIED nếu quan sát đầy đủ. Đọc lại thất bại -> báo RULESET_CREATED_BUT_UNVERIFIED, không giả nhận.
7. **Thu hẹp quyền:** sau setup, thu hồi quyền quản trị tạm của automation. Công việc thường ngày chỉ dùng quyền đọc, ghi branch, PR, Issue và CI thích hợp.

## Cấu hình baseline sau phê duyệt

- Chặn xóa nhánh mặc định.
- Chặn force-push.
- Bắt buộc thay đổi qua Pull Request.
- Không cấu hình bypass actors.
- Không mặc định yêu cầu số reviewer hoặc các CI status check chưa xác định được. Baseline có required_approving_review_count=0 để tránh tự khóa dự án chỉ một người/agent. Tăng mức độ bảo vệ cần kiểm tra CI context và reviewer thực tế rồi trình Owner một đề xuất khác.

**Baseline không tương đương xác nhận đã bật hết các cổng bảo mật.** Nghiệm thu kỹ thuật của Lead và phê duyệt release của Owner là các lớp tách biệt.

## Các lệnh tùy chọn cho agent có CLI

Công cụ đọc token từ biến môi trường PCS_GITHUB_TOKEN hoặc GITHUB_TOKEN trong secret store. Không dán token trong chat, Issue hay log.

Đọc kế hoạch trước, không có thay đổi GitHub:

    PCS_GITHUB_REPO=OWNER/PROJECT node tools/pcs-branch-guard.mjs plan

Khi status là OWNER_APPROVAL_REQUIRED, Lead tạo Issue GitHub trong repository dự án với marker:

    <!-- pcs-branch-guard -->

Lead trình bày tác động bảo vệ nhánh và lệnh trả về từ tool. Owner bình luận bằng chính tài khoản GitHub của mình:

    /pcs protect-default OWNER/PROJECT 64_HEX_PLAN_SHA256

Sau khi xác nhận quyền quản trị thuộc về một principal riêng của agent, Lead chạy:

    PCS_GITHUB_REPO=OWNER/PROJECT node tools/pcs-branch-guard.mjs apply --issue=N --comment=N

Đối chiếu hiệu lực:

    PCS_GITHUB_REPO=OWNER/PROJECT node tools/pcs-branch-guard.mjs verify

**Các lệnh trên dành cho agent có môi trường thực thi, không phải thao tác mặc định của Owner.** Nếu connector không hỗ trợ Admin API, Lead báo ADMIN_TOOL_UNAVAILABLE và xin đúng quyền/công cụ cần thiết, không tuyên bố đã áp dụng.

## Điều kiện và giới hạn

- GitHub rulesets cho public repo hỗ trợ gói Free; private repo yêu cầu gói GitHub phù hợp (Pro, Team hoặc Enterprise). Không thể xử lý hạn chế gói bằng cách nới quyền token. [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets); [REST API](https://docs.github.com/en/rest/repos/rules).
- Token Owner dùng chung với agent không chứng minh người thực sự đồng ý. Module từ chối nếu tài khoản người thực thi trùng tài khoản Owner hoặc không thể xác minh danh tính caller qua GitHub /user. Token GitHub App installation cần phương án nhận dạng khác; trong bản này không tự khẳng định hỗ trợ đầy đủ.
- Không tự tắt protection, không sửa ruleset cũ, không cấp bypass để giải quyết lỗi merge, không áp dụng hàng loạt, không tự động cấu hình repo PCS public.
- Phản hồi trong chat là định hướng sản phẩm; thay đổi quyền admin thực tế cần phê duyệt có chứng cứ và identity độc lập.
- Các bài test là unit/mock qua GitHub API, chưa chứng nhận E2E trên repository private có principal độc lập. Khi triển khai thực tế nên thử repository mới trước.
- Công cụ mới không thay đổi schema PCS 3.1.0, không tạo nguồn trạng thái thứ hai và không tự migration Advanced HEAD lịch sử.

[Mã nguồn](../runtime/pcs3-branch-guard.mjs) · [CLI](../tools/pcs-branch-guard.mjs) · [Kiểm thử](../tests/branch-guard.test.mjs)
