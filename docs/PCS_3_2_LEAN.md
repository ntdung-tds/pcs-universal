# PCS 3.2 — Lean Contributor Management

**Ngày:** 01/11/2026 · **Trạng thái:** Candidate, chờ CI trên Pull Request và E2E private sandbox.

## Mục tiêu

**Một hệ thống PCS, một `pcs/STATE.json`, một Lead Agent; quản lý theo phạm vi, đầu ra và mức rủi ro.** Owner chỉ chọn mục tiêu/mốc, xem demo và yêu cầu điều chỉnh; Lead tự lập kế hoạch, phân công/review và nghiệm thu kỹ thuật; contributor được tự đề xuất và, khi được quyền, tự nhận việc bình thường.

Không tạo mode/repository/canonical HEAD thứ hai. Không yêu cầu chạy CLI hoặc đăng ký lại mỗi task. GitHub Issues/PR là nơi cộng tác; PCS Moment để chuyển phiên, không phải quy trình phê duyệt riêng.

## Ba mức kiểm soát thích ứng (không phải ba hệ trạng thái)

| Mức | Kích hoạt | Hành vi |
|---|---|---|
| **Solo** | Không có registry hoặc một agent đang tham gia, task thông thường | AI tự lập kế hoạch và làm việc; không cần quy trình đăng ký contributor. Nếu task nguy cơ cao, vẫn cần Owner |
| **Collaborative** | Nhiều contributor đã duyệt, task thông thường | Lead điều phối; agent được tự đề xuất và tự nhận task đủ điều kiện; PR + CI + Lead review theo loại deliverable |
| **Controlled** | Risk cao/không rõ, dữ liệu nhạy cảm, production, IAM, xóa dữ liệu, tiền hoặc thay đổi quan trọng | Đưa về Owner approval xác thực + đầy đủ cổng kỹ thuật; không tự nhận task |

Mức được suy ra theo **từng task**, không phải toggle toàn dự án. Các trường rủi ro trong `state.tasks[]` phải do Lead xem xét và phân loại; không tin nội dung tự khai từ proposal. `LOW`/`NORMAL` và `PUBLIC`/`INTERNAL` có thể được xem xét self-claim. Thiếu/không rõ risk, `HIGH`, `CRITICAL`, `SENSITIVE`, `CONFIDENTIAL`, `RESTRICTED` hoặc các cờ `security_sensitive`, `production`, `destructive`, `iam_change`, `credentials_change`, `external_spend`, `data_migration`, `requires_owner_approval` dẫn tới Controlled. Không dùng metadata để né đánh giá thực tế về rủi ro.

## Quy trình task duy nhất

`Backlog → Ready (PLANNED + dependencies met) → In Progress → In Review → Done`.

Đây là **nhãn quy trình người dùng**; PCS vẫn giữ trạng thái schema `PLANNED`, `IN_PROGRESS`, `TECH_DONE`, `INTEGRATION_PENDING`, `ACCEPTED`, `BLOCKED`, `CANCELLED`. Không đổi schema, không migration ép buộc. Một task chỉ có một assignee trong state. Đề xuất task mới trước hết được Lead đưa vào backlog; không tự thêm scope hoặc tự cấp quyền.

- **Join:** contributor xin tham gia, Owner hoặc Lead ủy quyền duyệt **một lần cho tư cách tham gia** với GitHub Issue/comment có chứng cứ. Không đăng ký lại ở mỗi task hoặc mỗi chat. Đăng ký trong state **không tự cấp GitHub permissions**.
- **Self-claim:** contributor đã `APPROVED`, `IDLE`, dùng **GitHub identity riêng không trùng Owner**, có thể tự nhận task `PLANNED` rủi ro LOW/NORMAL, không có assignee, dependencies `ACCEPTED`, khi `collaboration.policy.self_claim_normal===true`. Không cần comment phê duyệt thêm cho task này.
- **Lead assignment:** Lead vẫn được phân công/giao lại hoặc duyệt đề xuất thông thường theo chính sách hiện hành; cần tránh trùng và review trước khi đưa task mới vào backlog. Không tự review PR của chính mình.
- **Delivery:** contributor làm trong branch riêng/PR; Lead review mã, kiểm tra CI và tích hợp, ghi nghiệm thu kỹ thuật nếu đủ chứng cứ. Không tự chuyển task thành `ACCEPTED` vì vừa self-claim, merge PR hoặc đóng Issue.
- **Owner:** nghiệm thu UX/giá trị sản phẩm theo feature, milestone hoặc release; `UNVERIFIED_CHAT` chỉ là phản hồi định hướng, **không** là phê duyệt production, IAM hay quyết định cần kiểm toán.

## Kích hoạt và tương thích dự án cũ

- `initCollaboration` cho **dự án mới PCS 3.2** tạo `policy.self_claim_normal=true` cùng các chính sách cũ. Quyền này **không cho phép agent chưa được duyệt tham gia**, cũng không bỏ qua Owner-only scope.
- **Dự án có `pcs/STATE.json` cũ:** thiếu `self_claim_normal` đồng nghĩa `false` (fail-closed). Owner phê duyệt thay đổi policy trên GitHub sau khi đánh giá rủi ro; Lead cập nhật cùng revision/checkpoint và chứng cứ GitHub hợp lệ. Không tự bật khi upgrade.
- **Solo:** không cần khởi tạo collaboration; tiếp tục quy trình một AI và giữ policy nhạy cảm. Không sinh `AGENTS.json` riêng.
- **Advanced HEAD legacy:** không tự migration hoặc dual-write `pcs3.head.v1` và `pcs3.simple.v1`.
- **Version field:** thay `state.version` của dự án mới là `3.2.0`; không tự nâng bản cũ nếu chưa kiểm tra schema/đồng bộ.

## Công cụ tham khảo (agent có môi trường và quyền)

```bash
node runtime/pcs3-agent-operator.mjs status
# Khi agent đã approved + IDLE, task đủ điều kiện, repo private:
node runtime/pcs3-agent-operator.mjs self-claim --expect=REVISION --task=T1 --agent=AGENT02
```

Token chỉ lấy từ secret store; `PCS_GITHUB_REPO` trỏ vào **repository dự án do Owner chọn**; Private vẫn là lựa chọn an toàn cho dữ liệu nội bộ. Public chỉ dùng sau khi qua chính sách phân loại, xét duyệt và cấu hình riêng trong [STATE operations](STATE_OPERATIONS.md). Operator kiểm tra `/user` bằng GitHub API, đọc `pcs/STATE.json` từ HEAD, kiểm tra scope và phân quyền, ghi `STATE`, `MOMENT`, snapshot **trong một commit**, cập nhật branch không force. Nếu branch protection chặn, kết quả `REVIEW_REQUIRED` là **PR chờ review, chưa phải tự nhận việc thành công**. Nếu connector không cho xác minh `/user` (ví dụ một số GitHub App installation), `AGENT_IDENTITY_BLOCKED`, không giả lập danh tính.

**Lead/AI không tự thức dậy trong các cửa sổ chat độc lập.** Muốn tự kích hoạt nhiều agent cần coordinator/triggers có quyền thực, triển khai và kiểm thử riêng. Các agent vẫn có thể phối hợp thủ công bằng cách mở phiên dùng cùng PCS State.

## Bảo mật và cổng kiểm thử

Giữ nguyên 3.1.1: branch protection, least privilege, kiểm tra risk thực, owner approval độc lập cho thay đổi nhạy cảm, Lead lease/epoch, review/CI, không dùng chung Owner token, không tự bypass. Logic `authorizeLeanClaim` + `applyLeanClaim` dùng bằng chứng bất biến trong cùng tiến trình và snapshot digest để chống giả mạo/replay **ở cấp module**; bảo vệ thực tế vẫn phụ thuộc danh tính GitHub, branch permissions và checkpoint CAS.

- **Unit / mock CI:** `tests/lean-management.test.mjs` kiểm tra duplicate, stale, risk gates, agent/Owner identity, legacy opt-out, regression; xem GitHub Actions của PR.
- **E2E chưa chứng nhận:** một sandbox private, hai GitHub principals độc lập, quyền GitHub App, PR protected branch, GitHub connector thực, ChatGPT↔Claude; tài liệu test theo [Issue #9](https://github.com/ntdung-tds/pcs-universal/issues/9).
- **Branch governance còn mở:** [Issue #8](https://github.com/ntdung-tds/pcs-universal/issues/8). Không coi CI xanh là bằng chứng branch rules đã áp dụng.

## Quy tắc thực thi của AI

Đầu phiên: đọc state và revision mới nhất; xem đề xuất, backlog, active assignments, dependencies, rủi ro, test và Owner feedback. Chỉ tự nhận task thông thường đủ điều kiện. Với task chưa phân loại, bị khóa, chưa được quyền, hoặc Owner-only, **dừng thao tác cần phê duyệt**, báo vấn đề và đề xuất bước xử lý. Khi xong, review/CI trước nghiệm thu và lưu PCS Moment; báo kết quả có link thực, không tuyên bố xong E2E/production nếu chưa có chứng cứ.
