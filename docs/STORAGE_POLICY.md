# Chính sách lưu trữ GitHub + Drive — bắt buộc

## Thứ tự nguồn

- **GitHub:** chỉ một bản canonical của PCS Project, Moment, Plans, Task, Acceptance, Audit; tham chiếu source và artifact (Drive/GitHub).
- **Google Drive:** ưu tiên cho SRS/report/media/QA evidence khi khả dụng, đúng quyền và chính sách phân loại.
- **Fallback và khôi phục:** bản sao **nội dung được phép lưu** luôn được lưu trên GitHub trước (**mã hóa** khi phân loại `CONFIDENTIAL`); `RESTRICTED` và secrets bị chặn; nếu Drive không có, lỗi upload, thiếu permission, quota, token hết hạn hoặc checksum không khớp => dùng bản sao GitHub (Contents hoặc Releases draft); lưu manifest và hash trong HEAD. Nếu GitHub không nhận được file thì báo BLOCKED, không giữ “ảo” trên local rồi tuyên bố thành công.

## Quản lý artifacts

1. Phân loại artifact, xác định quyền lưu GitHub/Drive. Với `CONFIDENTIAL`, mã hóa AES-256-GCM trước upload. `RESTRICTED` và credential không được upload. Tính SHA-256 từ bytes được lưu, ghi size và MIME; với tệp mã hóa lưu thêm plaintext hash để phục hồi/đối chiếu sau giải mã.
2. Lưu nội dung vào GitHub trước. Nếu Drive upload thành công và trả `file_id` + size (và MD5 khi hỗ trợ), ghi pointer Drive cùng trường `github_mirror` vào GH. Nếu GH HEAD commit thất bại, báo ORPHAN; có thể xóa Drive orphan khi được phép hoặc reconcile lại pointer.
3. Fallback GH `artifacts/<sha>-<name>` cho file <=800 KB; file lớn dùng GitHub Releases draft assets. Giới hạn thực tế cần xem GitHub policy (thường mỗi release asset <=2 GiB); file quá giới hạn cần chia phần có kiểm chứng hoặc xin quyết định một phương pháp lưu GitHub khác. Không silently drop.
4. Nếu Drive sau đó mất file, bản sao GitHub vẫn còn; `verify` hiện chỉ kiểm tra hash trạng thái, chưa tự tải lại từng binary để xác nhận mirror còn tồn tại. Cần audit artifacts định kỳ.
5. Không được commit secrets, khóa riêng, PII không được phép hoặc ảnh riêng tư vào repo công khai. Repo private không tự động bảo đảm tuân thủ chính sách lưu trữ dữ liệu.

## Conflict / retry

- Mỗi write vào HEAD dùng GitHub `sha` cũ; conflict 409/422 hoặc revision stale => reload latest, so sánh thay đổi, merge, giữ provenance, commit lại.
- Retry idempotent: nội dung fallback nhỏ theo SHA; event UUID là append-only. Nếu crash giữa event và HEAD, event là orphan cần kiểm tra, không fake PASS.
- API rate limits 403/429 và quota: backoff hợp lý, báo rõ; do not DOS/loop indefinitely. Không copy access token vào SRS, prompt, repo hay logs.

## Quyền và backup

- Fine-grained GitHub token: Contents read/write trên repo được chọn, không cấp quyền tổ chức rộng; bắt buộc bảo vệ branch/PR theo rủi ro.
- Drive OAuth token phạm vi tối thiểu và folder riêng. Credential chỉ ở môi trường và secret manager.
- Định kỳ export Git repository và các file Drive liên quan hoặc chính sách duplicate để có disaster recovery thật; GitHub + Drive không bảo đảm 100% availability.

Nguồn: https://docs.github.com/en/rest/repos/contents ; https://docs.github.com/en/rest/releases/assets ; https://developers.google.com/workspace/drive/api/guides/manage-uploads

## Nâng cấp bảo mật PCS 3.0.1

Không bao giờ diễn giải “fallback toàn bộ GitHub” thành quyền vô điều kiện để sao lưu bí mật/PII. Dữ liệu không được phép lưu phải báo `SECURITY_BLOCKED`. Scanner chưa phải DLP, không quét nội dung bên trong DOCX/PDF nén. Metadata trạng thái GH HEAD không mã hóa; đừng đưa dữ liệu mật vào các trường này. Xem `docs/DATA_CLASSIFICATION.md`.
