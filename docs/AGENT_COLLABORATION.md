# PCS — Cộng tác AI linh hoạt (Dynamic Agent Collaboration)

**Áp dụng cho từng repository dự án riêng tư.** Vẫn chỉ có **một nguồn trạng thái**: `pcs/STATE.json`. Không tạo riêng `AGENTS.json` hay kho canonical thứ hai. Mặc định **một AI đang làm việc**; thêm AI khi cần, không cố định chuyên môn hay nhiệm vụ.

## Bạn phải làm gì?

- **Bắt đầu dự án:** mở `PROMPT.md`, dùng prompt chính. Không cần tạo thêm agent.
- **Muốn thêm GPT/Claude/Gemini:** mở cửa sổ chat mới, dùng đoạn **“Prompt agent mới xin tham gia”** trong `PROMPT.md` và dán link repository dự án. Agent được phép đề xuất công việc **hoặc xin tham gia mà chưa có nhiệm vụ**.
- **Muốn trực tiếp duyệt/giao việc:** trả lời rõ quyết định của bạn. Để quyết định được các agent khác tin cậy và PCS áp dụng tự động, cần ghi bằng một nguồn có thể xác minh danh tính chủ dự án; mẫu hiện tại dùng **bình luận trên GitHub Issue**.

## Ba cách phân công thống nhất

1. **Agent tự đề xuất:** đọc backlog, năng lực công cụ, phụ thuộc, nhiệm vụ còn trống → mở Issue đề xuất. Chỉ bắt đầu sau khi được duyệt và ghi vào state.
2. **Lead Agent đề xuất hoặc phân công:** xem backlog và agent rảnh; Lead được chủ dự án ủy quyền có thể duyệt **công việc thông thường**.
3. **Chủ dự án chỉ định:** bạn có thể tự duyệt, từ chối, giao việc, thu hồi hoặc đổi Lead. Quyết định của chủ dự án ưu tiên cao nhất.

**Một đề xuất bình thường chỉ cần một quyết định hợp lệ từ chủ dự án HOẶC Lead được ủy quyền.** Công việc nhạy cảm cần chủ dự án. Agent không được tự duyệt đề xuất của chính mình.

## Đăng ký và xác nhận quyền

Agent mới mở một **Issue trong repository dự án** (không phải repository PCS public) chứa marker:

`<!-- pcs-agent-join:JOIN01 -->`

Tiêu đề nên có `[PCS JOIN]` và mã `JOIN01`. Nêu agent ID, nguồn AI, GitHub account thực tế, khả năng công cụ, nhiệm vụ đề xuất (có thể để trống), phạm vi tác động, rủi ro, yêu cầu kiểm thử. Các thông tin tự khai chỉ là đề xuất, **chưa được xem là danh tính/ủy quyền hợp lệ**. Không đính kèm credential.

AI điều phối hoặc công cụ có quyền xác minh Issue qua GitHub API rồi ghi một proposal `PENDING` vào `state.collaboration`, cùng một checkpoint với PCS Moment. Nếu không có quyền ghi GitHub, báo `PERSISTENCE_BLOCKED` và không tự nhận đã đăng ký.

## Duyệt ngay trên GitHub Issue

Trong Issue của đề xuất, **bạn hoặc Lead được ủy quyền** viết đúng một lệnh trong bình luận riêng:

```text
/pcs approve JOIN01
```

Các lệnh khác:

```text
/pcs reject JOIN01
/pcs revoke JOIN01
/pcs assign JOIN01 T1,T2
```

- `approve`: cho agent tham gia; nếu đề xuất chưa có nhiệm vụ, agent trở thành `IDLE`.
- `assign`: bổ sung nhiệm vụ sau khi agent đã được duyệt, không giao trùng task.
- `revoke`: thu hồi phân công và quyền tham gia **trong PCS**. Việc thu hồi token/quyền GitHub thực tế phải được thực hiện riêng qua GitHub Settings/App, không thể chỉ sửa JSON.
- `reject`: từ chối yêu cầu chưa duyệt.

Lệnh chỉ được công nhận sau khi công cụ đọc **tác giả bình luận từ GitHub API**, xác minh repo/Issue/comment/marker và quyền quyết định, rồi ghi checkpoint có so sánh revision. Một đoạn chat hay nội dung Issue có dòng chữ “đã duyệt” không thay thế xác thực này.

## Chỉ một Lead Agent

Mặc định **Lead Agent = null trong hệ thống xác thực**, một agent đang làm việc vẫn có thể xử lý dự án như trước. Muốn cho Lead được duyệt agent mới, chủ dự án tạo Issue quản trị với marker:

`<!-- pcs-lead-governance -->`

Sau khi agent đầu tiên đã được duyệt, **chủ dự án** bình luận:

```text
/pcs designate-lead AGENT01 7d
```

Ủy quyền Lead có hạn, từ **1 đến 30 ngày**. Chỉ chủ dự án có quyền chỉ định/thay Lead và có thể hủy:

```text
/pcs clear-lead AGENT01
```

PCS chỉ lưu một Lead tại một thời điểm, kiểm tra hạn ủy quyền, ghi số phiên quyền (`epoch`). Hết hạn → Lead không được duyệt thêm cho tới khi chủ dự án gia hạn. Lead vẫn có thể làm công việc kỹ thuật được giao nếu quyền GitHub còn hiệu lực.

## Công việc và giới hạn

- Chỉ phân công task đã tồn tại trong `state.tasks`; nếu agent đề xuất việc mới, Lead/owner cập nhật backlog rồi mới giao.
- Một task chỉ có một agent được ghi nhận là phụ trách trong registry tại một thời điểm; nhiều người có thể review/trao đổi qua Issue/PR.
- Agent phụ không tự mở rộng phạm vi, cấp quyền, merge vào nhánh được bảo vệ, triển khai production, tự thêm agent hoặc tự chỉ định mình làm Lead.
- Nhiệm vụ `risk=HIGH/CRITICAL/SENSITIVE` hoặc `security_sensitive=true` bắt buộc chủ dự án duyệt; agent không được tự đổi nhãn để né chính sách.
- Nếu agent hết thời gian/đứt kết nối, Lead hoặc chủ dự án kiểm tra công việc và tiếp quản, không tự xóa lịch sử.
- Branch riêng và Pull Request; Lead chịu trách nhiệm review/tích hợp. GitHub Branch Rules/Permissions là lớp thực thi, PCS là lớp quản trị quy trình.

## Triển khai kỹ thuật sẵn có

- `runtime/pcs3-collaboration.mjs`: registry, proposal, phê duyệt theo danh tính GitHub, hạn Lead và phân công.
- `runtime/pcs3-agent-operator.mjs`: công cụ tùy chọn cho AI có terminal/API: đọc Issue/comment thật, cập nhật `pcs/STATE.json`, `pcs/MOMENT.md`, Moment JSON trong **một Git commit**, chống ghi đè bằng branch update không force.
- `templates/agent/`: mẫu Issue và proposal. Mỗi dự án sử dụng cùng file state hiện có, không yêu cầu cài hai chế độ.

Có thể dùng trực tiếp GitHub connector thay vì CLI nếu đủ quyền đọc Issue/comment và ghi repository, nhưng AI phải tuân thủ quy tắc xác thực + optimistic concurrency, không dựa vào văn bản tự khai. Nếu branch protection chặn ghi trực tiếp, phải đi theo branch/PR và review; **không tắt bảo mật để chạy**.

### Lệnh vận hành mẫu cho agent có terminal (không bắt người dùng chạy)

```bash
# Token phải được cấu hình trong môi trường an toàn. KHÔNG đưa token vào chat/log.
export PCS_GITHUB_REPO=OWNER/PRIVATE-PROJECT
# PCS_GITHUB_TOKEN từ secret store của môi trường chạy
node runtime/pcs3-agent-operator.mjs status
node runtime/pcs3-agent-operator.mjs bootstrap --expect=1
node runtime/pcs3-agent-operator.mjs register --expect=2 --proposal=join.json
node runtime/pcs3-agent-operator.mjs decide --expect=3 --issue=10 --comment=120 --action=approve --target=JOIN01
```

`--expect` lấy từ revision vừa đọc, không copy số trong ví dụ nếu dự án thực tế đã thay đổi. Sai revision → dừng, tải lại trạng thái. Công cụ từ chối dự án public. **Không có tác vụ nền hay GitHub Actions điều phối agent nào tự chạy chỉ vì repo PCS công khai tồn tại.**

## Giới hạn an ninh bắt buộc biết

- GitHub xác thực **tài khoản GitHub**, không phải danh tính từng cửa sổ ChatGPT/Claude. Nếu bạn và mọi agent dùng chung một tài khoản token có quyền ghi, PCS **không thể xác minh người nào thật sự ra quyết định**. Mẫu quản trị hiện **fail-closed** khi approver trùng GitHub login của agent xin tham gia. Muốn duyệt chặt, cho bot/agent tài khoản hoặc GitHub App riêng, và bạn dùng tài khoản Owner độc lập.
- Bảo vệ nhánh chính, hạn chế ai được sửa `pcs/STATE.json`, workflow và công cụ quản trị. Mọi người có quyền ghi không hạn chế có thể tự sửa state và bỏ qua validator. **Chỉ một file JSON hoặc prompt không phải cơ chế bảo mật hoàn chỉnh.**
- Repository của tổ chức (owner kiểu Organization) chưa hỗ trợ suy ra người phê duyệt; công cụ từ chối cho tới khi thiết lập danh sách owner được xác minh và chính sách độc lập.
- Tên người phê duyệt được lấy từ GitHub API, nhưng không thay thế xác minh quyền trong PR, kiểm chứng QA hay thu hồi token thực tế.
- `github_issue` và PCS state là nguồn quản trị công việc; đóng Issue, merge PR hoặc comment APPROVED không tự chứng minh test/E2E/release đạt.

## Tiêu chí nghiệm thu E2E còn phải thực hiện

Trong repository dự án thử private: agent 1 khởi tạo, agent 2 đăng ký rảnh, agent 3 tự đề xuất task, owner duyệt, Lead được owner ủy quyền duyệt bình thường, từ chối task nhạy cảm, hai người ghi cạnh tranh, revoke/cấp lại, branch protection bật, và chuyển phiên ChatGPT↔Claude. Bộ test giả lập không thay thế các bài thử thật này.

## Bản vá quyền phê duyệt — 01/11/2026

- **Phân loại rủi ro:** Lead chỉ có thể duyệt các task có rủi ro xác định rõ `NORMAL` hoặc `LOW` và không có dấu hiệu nhạy cảm. Rủi ro thiếu/không nhận diện hoặc `HIGH` (bất kể chữ hoa/thường), dữ liệu `CONFIDENTIAL`/`RESTRICTED` đều yêu cầu Owner.
- **Quyết định bất biến:** bằng chứng phê duyệt chỉ hợp lệ với đúng đề xuất, hành động, task, comment GitHub và snapshot dự án đã xác minh. Nếu đề xuất, task, phiên quyền Lead, chính sách hay trạng thái khác thay đổi, phải lấy bằng chứng mới.
- **Lead có thời hạn:** cả lúc xác thực và lúc áp dụng quyết định đều kiểm tra epoch, tư cách và thời hạn Lead. Thu hồi hoặc thay Lead vô hiệu hóa quyết định cũ chưa thực thi.
- **Nhánh được bảo vệ:** khi GitHub chặn ghi trực tiếp (403), operator thử tạo branch và PR. Kết quả `REVIEW_REQUIRED` chỉ có nghĩa là chờ review; **không** coi agent đã được cấp phép trước khi PR hợp nhất và trạng thái được xác minh.
- **Giới hạn không thay đổi:** GitHub login không xác thực danh tính cửa sổ chat; token dùng chung không chứng minh Owner thực sự đồng ý; tệp state không thay thế rulesets/branch protection. Các AI ở cửa sổ riêng không tự thức dậy. Vẫn chưa có multi-provider E2E, watcher hay migration hợp nhất Simple/Advanced.
