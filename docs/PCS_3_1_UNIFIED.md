> **Tài liệu tương thích v3.1.1:** Với PCS 3.2, quản lý task rủi ro thấp theo [quy trình Lean Contributor](PCS_3_2_LEAN.md) thay vì xin phê duyệt mỗi task. Quy tắc review/Owner feedback, governance và security ở đây tiếp tục áp dụng.

# PCS Unified 3.1.1 — Contributor Workflow & Owner Feedback

**Ngày phát hành:** 2026-11-01. **Phạm vi mặc định:** Một dự án riêng tư trên GitHub; một nguồn trạng thái `pcs/STATE.json`; một AI Lead được ủy quyền; contributor được tự đề xuất việc.

## Bổ sung PCS 3.1.1: Lead tự thiết lập bảo vệ nhánh

Lead chủ động đọc cấu hình GitHub, giữ nguyên bảo vệ có sẵn, trình Owner đề xuất bảo vệ nhánh mặc định nếu cần. Chỉ áp dụng khi có công cụ Administration API và chứng cứ phê duyệt từ tài khoản Owner độc lập; nếu không, báo rõ rào cản. Không bắt Owner tự chỉnh từng rule. [Chi tiết](BRANCH_GOVERNANCE.md).

## Trải nghiệm dành cho Project Owner

Bạn chỉ cần xem kết quả (website chạy thực tế, ảnh chụp, tài liệu, bản demo, test/CI), rồi nói **“Ổn rồi”**, **“Chỉnh lại phần này”** hoặc **“Tôi chưa đồng ý”**. Bạn không phải review code hay chạy test. Lead tự quản lý kỹ thuật, tự giao task tiếp theo trong phạm vi đã được ủy quyền.

PCS phân biệt:

1. **Phản hồi trong chat:** AI có thể ghi lại làm `delivery.owner_notes[]`, đánh dấu `UNVERIFIED_CHAT`. Nó giúp Lead lên kế hoạch sửa, tiếp tục công việc và báo lại kết quả nhưng **không phải** chứng cứ xác thực Owner đã phê duyệt một release hoặc triển khai production.
2. **Phản hồi được xác minh:** Nếu cần cổng nghiệm thu sản phẩm có thể kiểm toán hoặc production, Owner để lại bình luận GitHub Issue được xác thực. PCS ghi `delivery.owner_feedback[]` với `AGREED`, `CHANGES_REQUESTED` hoặc `NOT_AGREED`, gắn với commit đã xem. Các quyền GitHub của mỗi người/AI cần được phân tách.

Không có biểu mẫu bắt buộc trong mỗi vòng phản hồi; chỉ sử dụng chứng cứ xác thực khi chính sách dự án, rủi ro hoặc quyền thực thi yêu cầu.

## Quyền và trách nhiệm

| Hành động | Owner | Lead | Contributor |
| --- | --- | --- | --- |
| Đề xuất task | Có | Có | Có, không tự kích hoạt |
| Phân công/duyệt task thường | Có | Có trong thời hạn ủy quyền | Không |
| Quyết định phạm vi hoặc quyền nhạy cảm | Có | Đề xuất | Đề xuất |
| Review mã, kiểm thử, chấp nhận kỹ thuật | Có thể | Chịu trách nhiệm | Không tự nghiệm thu |
| Chọn việc tiếp theo | Có thể | Có | Có thể đề xuất |
| Nghiệm thu kết quả theo cảm nhận sản phẩm | **Có** | Không được giả mạo | Không |
| Production, xóa dữ liệu, thay đổi IAM quan trọng | Phê duyệt theo chính sách | Không tự vượt quyền | Không |

**Lead chấp nhận kỹ thuật ≠ Owner đồng ý sản phẩm ≠ GitHub cho phép merge hoặc triển khai.** Ba cơ chế độc lập.

## Luồng chuẩn

1. Lead tiếp nhận yêu cầu, tạo backlog, phân công task theo GitHub Issues, phân tách môi trường/branch cho từng contributor.
2. Contributor nhận task hoặc tự đề xuất. Lead/Owner có thể phê duyệt đề xuất thông thường; Owner duyệt thay đổi nhạy cảm. Không có agent nào có quyền tự duyệt đề xuất của mình.
3. Contributor viết mã, tự kiểm thử và tạo Pull Request có marker `<!-- pcs-task:T1 -->` trong nội dung. Lead review PR, yêu cầu sửa nếu chưa đạt.
4. **Nghiệm thu kỹ thuật:** Bản tham chiếu PCS 3.1 chỉ chấp nhận nếu PR đã merge, PR đúng repo/assignee, review Lead là APPROVED tại commit PR HEAD và tất cả check-runs trả về đã hoàn thành thành công. Nếu thiếu quyền đọc GitHub hoặc kiểm tra chưa đủ dữ liệu, không tự nhận TECH_ACCEPTED. Nghiệm thu kỹ thuật được ghi vào `state.delivery.technical_reviews[]`, giải phóng phân công và đề xuất các task tiếp theo khi phụ thuộc đã đạt.
5. Lead tự giao task mới theo quyền ủy quyền, hoặc đợi agent nhận việc trong lần chạy tiếp theo nếu các cửa sổ AI độc lập không có coordinator.
6. Khi đến mốc có sản phẩm xem được, Lead trình bày link demo/ảnh/tóm tắt, điều đã test và các hạn chế để **Owner xem và phản hồi**. Owner được quyền đồng ý, yêu cầu sửa hoặc bác bỏ. Lead chỉ tiếp tục triển khai phần Owner chấp thuận; không tự tuyên bố Owner đã đồng ý.
7. Chỉ đóng cổng release/production sau khi đủ bằng chứng kiểm thử, quy tắc bảo vệ nhánh, và phê duyệt có nguồn xác thực theo chính sách dự án.

## Lệnh/operator tùy chọn cho AI có terminal, không bắt Owner chạy

```bash
# AI đã có GitHub token trong secret store; không dán token vào chat.
node runtime/pcs3-agent-operator.mjs status
node runtime/pcs3-agent-operator.mjs technical-review --expect=N --task=T1 --agent=WORK01 --pr=42
node runtime/pcs3-agent-operator.mjs owner-feedback --expect=N --scope=release --target=R1 --issue=63 --comment=222 --sha=40_HEX_COMMIT
```

`--expect` là PCS revision mới nhất, không dùng cố định theo ví dụ. Nếu branch bị bảo vệ, operator có thể tạo PR và trả về `REVIEW_REQUIRED` — **chưa có hiệu lực cho đến khi merge và kiểm chứng**.

### Mẫu xác nhận Owner qua GitHub (khi cần kiểm toán)

Tạo GitHub Issue trong repo dự án chứa marker `<!-- pcs-owner-review:release:R1 -->`. Lead cung cấp URL bản demo và chính xác commit SHA để bạn xem. **Chính bạn** bình luận đúng một trong ba lệnh sau với SHA 40 ký tự (không dùng dấu `<>`):

```text
/pcs agree release R1 0123456789abcdef0123456789abcdef01234567
/pcs changes release R1 0123456789abcdef0123456789abcdef01234567
/pcs disagree release R1 0123456789abcdef0123456789abcdef01234567
```

Với phản hồi tính thẩm mỹ hoặc điều chỉnh UX thông thường, bạn chỉ cần nói trong chat; không cần dùng GitHub Issue ở mỗi lần góp ý. Nếu bản bạn xem đã khác commit mới nhất, PCS yêu cầu kiểm chứng lại thay vì âm thầm phê duyệt bản khác.

## Dữ liệu trong một state

```json
{
  "schema": "pcs3.simple.v1",
  "revision": 7,
  "state": {
    "schema": "pcs3.project-state.v1",
    "version": "3.1.0",
    "collaboration": {"schema":"pcs3.collaboration.v1"},
    "delivery": {
      "schema": "pcs3.delivery.v1",
      "technical_reviews": [],
      "owner_feedback": [],
      "owner_notes": []
    }
  }
}
```

**Đoạn trên là minh họa các trường; không phải file state đầy đủ hợp lệ để copy.** Khi nâng dự án cũ, giữ nguyên dự án và state hiện có, chỉ bổ sung các trường tùy chọn khi dùng workflow mới.

GitHub Issues/PRs là dữ liệu nguồn cho từng ticket, mã nguồn và review. PCS giữ các quan hệ sản phẩm/luồng nghiệp vụ, điều phối, quyết định, chứng cứ xác nhận và PCS Moment. Nếu Issue/PR và state xung đột, tải lại GitHub rồi đối chiếu; không ghi đè âm thầm.

## Giới hạn v3.1.0

- Hiện chưa có watcher luôn chạy tự đánh thức mọi cửa sổ GPT/Claude khi Issue mới được tạo. Việc tự khởi động agent phụ cần connector/API hoặc coordinator đang hoạt động.
- Nếu Owner và agent dùng chung GitHub login/token có quyền ghi, không thể chứng minh phê duyệt của con người độc lập. Bảo vệ repo và quyền danh tính riêng trước khi tin vào cổng phê duyệt.
- CI mocked GitHub chứng minh logic quy trình và lỗi ghi, **không** phải chứng nhận E2E giữa ChatGPT/Claude trên một private repo thực tế.
- Nhánh Advanced HEAD/event lịch sử vẫn tồn tại cho các dự án đã triển khai; **không** tự migration hoặc dual-write. V3.1 áp dụng thống nhất `pcs/STATE.json` cho dự án mới theo prompt public.
- `TECH_ACCEPTED` trong ledger kỹ thuật không tự thay trạng thái core task thành `ACCEPTED`, không thay thế QA/CI thực tế, và không tự bật quyền production.
- GitHub App/ruleset/real CI cần kiểm chứng trên repository dự án; không tự nhận đã cấu hình.

[Xem chính sách agent](AGENT_COLLABORATION.md) · [Khởi tạo dự án](SIMPLE_MODE.md) · [Test report](../TEST_REPORT.md)
