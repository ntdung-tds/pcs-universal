# PCS 3.2 — trạng thái gọn, chẩn đoán và vận hành an toàn

## Nguyên tắc
- **Một** `pcs/STATE.json` canonical trong repository dự án. `pcs/MOMENT.md` là bản tóm tắt tạo từ STATE; không sửa độc lập. Không trộn legacy HEAD/PCS 2.1 hoặc tự migration.
- Khi tiếp tục một dự án, AI **đọc MOMENT trước**; kiểm tra revision/commit SHA và mở phần STATE, mã nguồn, Issue/PR/evidence liên quan. Hệ thống xác thực **toàn bộ** STATE trước mỗi commit dù AI chỉ xem một phần. Không bỏ qua dependency, test hoặc approval vì tiết kiệm token.
- `renderMoment()` giới hạn mỗi nhóm 12 mục chưa hoàn tất (ưu tiên active/blocked/review) + 3 mục đã ACCEPTED gần nhất, kèm tổng số và chỉ dẫn truy xuất. Đầy đủ dữ liệu vẫn nằm trong STATE.
- Khi State thay đổi đồng thời: load lại HEAD/revision, so sánh và reconcile; không force push. `ACCEPTED` và provenance chỉ là metadata cho đến khi kiểm chứng được bằng nguồn thật.

## Chẩn đoán có chọn lọc — công cụ CLI TÙY CHỌN
Nếu AI có Node.js (không yêu cầu người dùng cài để sử dụng PCS qua chat):
```bash
node tools/pcs-state-inspect.mjs inspect --file=/path/to/project/pcs/STATE.json --group=tasks --limit=12
node tools/pcs-state-inspect.mjs diff --before=/safe/old/STATE.json --after=/safe/new/STATE.json --limit=12
```
Công cụ chỉ đọc, xác thực cấu trúc, trả số lượng, ID, trạng thái và **tên trường thay đổi**; không cố in SRS/mô tả tự do. Mặc định giới hạn 12 mục, tối đa 50. Không phải hệ thống DLP hay chứng nhận kiểm thử E2E; ID và classification vẫn có thể nhạy cảm nên chỉ chạy trong môi trường đủ quyền. Nếu agent không chạy được, dùng GitHub connector để đọc mục cần thiết thay vì yêu cầu người dùng thao tác.

## Repository Public hoặc Private
**Người dùng quyết định quyền hiển thị.** Các thao tác cộng tác có quyền chỉ được vận hành trên Public khi:
1. Public là lựa chọn có chủ đích và được ghi nhận ngoài lời tự khai của AI; GitHub repo visibility đã được xác minh.
2. `state.policy.repository_visibility='PUBLIC'`, `content_classification='PUBLIC'`, `public_content_reviewed=true`, mọi mục trong `source_refs/tasks/features/flows/releases/decisions/risks/approvals/artifacts` phải khai báo `classification:'PUBLIC'`. Không chứa SRS nội bộ, thông tin định danh cá nhân, bí mật hay nguồn không được phép công khai. Bộ quét regex chỉ hỗ trợ, **không chứng minh dữ liệu an toàn**.
3. Với governance operator tùy chọn, môi trường vận hành đã thiết lập `PCS_ALLOW_PUBLIC_REPO=true` sau khi Owner chấp thuận. Với contributor tự nhận việc cần `state.collaboration.policy.allow_public_repo=true` theo quy trình phân quyền Owner thực tế.
4. Owner/Lead và Contributor vẫn cần GitHub identity riêng, branch protection, PR/review độc lập và kiểm soát quyền đầy đủ. Các cờ policy trong STATE **không phải chữ ký số Owner**.

Private vẫn là lựa chọn an toàn cho dữ liệu nội bộ. Đổi từ Private sang Public **không tự động được phép** chỉ bằng sửa một biến. Cần phân loại/review dữ liệu, lịch sử commit, Issue, PR, artifact và repository settings trước khi công khai; dữ liệu đã từng commit có thể vẫn lộ trong history.

## Khóa mã hóa CONFIDENTIAL
Runtime đã dùng AES-256-GCM; nay `encodeArtifact()` nhận `keyId` công khai (mặc định từ `PCS_ARTIFACT_KEY_ID`) và có `rotateConfidentialArtifact(envelope,{slug,oldKeyBase64,newKeyBase64,newKeyId})` để **giải mã rồi mã hóa lại offline**. Đây chỉ là công cụ hỗ trợ, không phải KMS/rotation service.

Quy trình chuẩn cần Owner/security operator phê duyệt: sao lưu và kiểm chứng khóa cũ trong secret manager, tạo khóa mới riêng, tải artifact trong môi trường tin cậy, chạy re-encrypt, kiểm tra decrypt/hash bằng khóa mới, publish ciphertext và sửa manifest/metadata trong PR/transaction có thể phục hồi, rồi kiểm tra toàn bộ bản sao/backup trước khi thu hồi khóa cũ. Không dán bất kỳ khóa nào vào chat, repo, log hay CI; **không xóa khóa cũ khi chưa xác minh các artifact cũ**, vì envelope legacy không tự chứa key ID đầy đủ. Thay biến môi trường đơn thuần không xoay khóa cho dữ liệu đã lưu.

## Debug và lỗi
| Triệu chứng | Cách xử lý |
| --- | --- |
| `PUBLIC_POLICY_REQUIRED` / `PUBLIC_DATA_BLOCKED` | Dừng ghi, kiểm tra Owner choice và phân loại công khai |
| `PUBLIC_REPOSITORY_NOT_AUTHORIZED` | Chưa đủ chấp thuận/quyền vận hành Public |
| `CONFLICT` / `STALE_*` | Tải revision/HEAD mới nhất, diff, hòa giải, thử lại |
| `REVIEW_REQUIRED` | PR chưa merge; không đánh dấu đã lưu canonical |
| `SECURITY_BLOCKED` | Không đăng bí mật; phân loại lại và xử lý ở nơi được phép |
| `GITHUB_WRITE_BLOCKED_403` | Kiểm tra quyền, branch protection; không tắt rule |
| `AGENT_IDENTITY_BLOCKED` | Kiểm tra danh tính GitHub thực, không giả lập `caller.login` |
| `CHECKPOINT_NOT_PUBLISHED` | Kiểm tra orphan event/HEAD, tránh nhân đôi quyết định |

Các lỗi trên không cho phép khẳng định đã test/triển khai production. Cần chứng cứ CI, PR, người review, log provider và thử E2E thật như [Issue #9](https://github.com/ntdung-tds/pcs-universal/issues/9). Hiện chưa có dashboard production, daemon giám sát hay KMS hoàn chỉnh.
