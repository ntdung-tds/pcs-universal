# PCS Simple Mode — giao SRS, AI tự vận hành trên GitHub

**Đây là chế độ mặc định dành cho ChatGPT, Claude, Gemini và các AI agent có quyền công cụ phù hợp.** Người dùng chỉ việc mở [`PROMPT.md`](../PROMPT.md), sao chép prompt, gửi SRS/SOW/đề cương hoặc mô tả yêu cầu. **Không cần thực hiện quy trình cài GitHub App, hai repository, Inbox, Gateway hay CLI trong Handbook.**

## Điều kiện thực tế

- Repo `pcs-universal` là **public và chỉ chứa công cụ PCS**, tuyệt đối không đưa SRS, dữ liệu dự án hoặc secrets vào đây.
- Mỗi dự án có **repository GitHub riêng, mặc định private**. Nếu agent có quyền tạo repository thì tự tạo; nếu chưa có thì yêu cầu đúng thao tác cấp quyền/tạo repo, không giả vờ đã lưu.
- Agent kiểm tra GitHub read/write trong phiên. Nếu chỉ có quyền đọc, được làm nghiên cứu/thiết kế tạm nhưng phải báo `PERSISTENCE_BLOCKED`. Google Drive tùy chọn; tệp dự án được phép lưu phải có bản sao trên GitHub. `CONFIDENTIAL` phải được bảo vệ đúng chính sách; `RESTRICTED` không tự đồng bộ.
- AI chat thiếu môi trường chạy code **không được nhận đã kiểm thử ứng dụng**. Chỉ nhận hoàn thành khi có kết quả công cụ thực tế hoặc review độc lập phù hợp.

## AI tự khởi tạo (không bắt người dùng thực hiện)

Trong **repository dự án**, agent tự tạo tối thiểu:

```
pcs/STATE.json              # Nguồn trạng thái chính, schema pcs3.simple.v1
pcs/MOMENT.md               # Điểm tiếp tục dễ đọc; sinh từ STATE
pcs/moments/                # Snapshots khi chuyển chặng hoặc phiên (nếu có khả năng ghi)
docs/project/PRODUCT_MAP.md # Mục tiêu, người dùng, tính năng, business flows
docs/project/ARCHITECTURE.md # Sơ đồ, phân hệ, dữ liệu, contracts
docs/project/PROJECT_PLAN.md # Mốc, phạm vi, nguồn lực/rủi ro phù hợp
docs/project/QA.md           # Test matrix và evidence thực
```

**Mẫu để agent tham chiếu, không phải để người dùng copy:** [`templates/simple/STATE.example.json`](../templates/simple/STATE.example.json). Thay slug/name, nguồn SRS và các trường giả lập; không lấy ví dụ làm sự thật. Sau khi AI đọc yêu cầu, lập backlog task → feature → flow → release trong `state` và hồ sơ kế hoạch. Các quan hệ required_* là cổng nghiệm thu; `dependencies` của task không được có chu trình.

**`pcs/STATE.json` là nguồn sự thật cho tiến độ/acceptance.** `pcs/MOMENT.md` chỉ là bản tóm tắt hiển thị từ STATE, không phải nơi nhập liệu song song. Không để status trong Issues khác biệt mà âm thầm ghi đè STATE.

## GitHub Issues / GitHub Projects — đơn giản mà chuyên nghiệp

- Agent tạo một GitHub Issue cho từng task **đáng theo dõi**, sử dụng marker `<!-- pcs-task:T123 -->` trong body, link Issue vào `task.github_issue` trong STATE. Không cần tạo Issue cho mọi thao tác kỹ thuật nhỏ.
- Trước khi tạo lại Issue, tìm marker/task ID để tránh trùng. Chỉ tự động tạo/đóng Issue nếu có quyền và được phép; khi nhiều AI cùng làm, đối soát kết quả trước khi ghi.
- GitHub Issues chứa trao đổi, PR/commit links và tiến độ thực thi. **Đóng Issue ≠ task ACCEPTED; PR merge ≠ feature được nghiệm thu.** PCS giữ các cổng QA và chấp thuận.
- GitHub Projects **tùy chọn** cho portfolio, roadmap và dashboard; nếu có quyền có thể đưa Issues vào Projects hoặc bật auto-add theo repo. Không bắt người dùng tạo Projects trước khi bắt đầu. Nếu Projects API không có, dùng Issues + STATE bình thường và ghi rõ.
- Agent có terminal/token có thể dùng helper `runtime/pcs3-issues.mjs` (mặc định *preview only*, `--apply=true` mới tạo). AI hội thoại có thể dùng các thao tác Issues của connector để làm cùng việc; helper không tự suy ra quyền của AI.

## Quy trình mỗi chặng (linh hoạt, không cố định cách lập trình)

1. **Đọc hiện trạng:** Nếu repository đã có `pcs/STATE.json`, đọc revision và MOMENT; xem git diff/PR/Issues mới nhất trước khi sửa. Với repo mới, phân tích SRS, quyết định kiến trúc vừa đủ rồi tạo cấu trúc ở trên.
2. **Hiểu tác động:** Với thay đổi đáng kể, tìm các feature, luồng, IAM, dữ liệu, API và hợp đồng liên quan. Agent tự chọn kỹ thuật tốt nhất; ghi ADR nếu thay đổi lớn.
3. **Thực hiện + kiểm chứng:** Test phù hợp phạm vi thay đổi. Task có thể `TECH_DONE` khi code xong, nhưng feature/flow/release phải đáp ứng điều kiện tích hợp, E2E/security/rollback theo mức rủi ro. Không ép QA PASS cho task nghiên cứu không yêu cầu chạy code; DoD tương ứng loại deliverable.
4. **Cập nhật theo lượt:** Sửa STATE (revision +1), thêm snapshot vào `pcs/moments/` nếu có thể, cập nhật MOMENT và link commit, Issues/PR/evidence. Khi dùng GitHub Contents API, ghi với blob SHA mới nhất để phát hiện conflict; đọc lại kết quả sau khi lưu. Nếu có xung đột, reload/reconcile, không force push.
5. **Bàn giao:** Nêu rõ đã làm, đã xác minh, chưa xác minh, blockers, GitHub revision/commit nếu có và **hành động tiếp theo chính xác**. Không cần bạn điền checklist.

## Bảo mật và xác thực nghiệm thu

Một trạng thái `ACCEPTED` với metadata `verification.state=VERIFIED` mới chỉ **đạt kiểm tra cấu trúc**. Nó **không chứng minh** CI URL, evidence SHA, danh tính người phê duyệt hoặc môi trường đã được xác thực. Agent phải đọc bằng chứng thực tế từ GitHub/CI/test tool/nguồn phê duyệt phù hợp; nếu chưa có quyền phải ghi `EXTERNAL_UNVERIFIED` và **không tuyên bố nghiệm thu đã xác minh**. Quy tắc production và dữ liệu nhạy cảm trong `SECURITY.md` vẫn áp dụng.

## Khi nào dùng Advanced Mode?

Chỉ khi cần **nhiều AI ghi song song với ràng buộc giao dịch nghiêm ngặt, GitHub Inbox, request receipts, canonical PCS tập trung hoặc API Gateway**. Xem [`docs/INSTALL_AND_ACTIVATE.md`](INSTALL_AND_ACTIVATE.md). Đây là một lựa chọn triển khai nâng cao, không phải bước cần làm trước mỗi dự án.
