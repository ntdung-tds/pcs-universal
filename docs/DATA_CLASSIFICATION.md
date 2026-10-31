# PCS 3.0.1 — Phân loại dữ liệu và lưu trữ an toàn

> Quy tắc: GitHub là nơi giữ trạng thái và bản sao artifact; Drive dùng khi sẵn có. **Không có nghĩa mọi loại dữ liệu đều được phép lưu ở GitHub.** Quyền truy cập, chính sách pháp lý, quyền của chủ sở hữu và bảo vệ bí mật luôn có ưu tiên cao hơn fallback. Nếu không có đường lưu được phép: `SECURITY_BLOCKED`, xin hướng xử lý.

| Mức | Ví dụ | GitHub/Drive |
|---|---|---|
| `PUBLIC` | tài liệu đã duyệt công khai | repo phù hợp; mặc định PCS vẫn yêu cầu private |
| `INTERNAL` | kế hoạch/SRS nội bộ không chứa bí mật | private repo, phân quyền tối thiểu; nếu Drive dùng được thì lưu thêm |
| `CONFIDENTIAL` | thiết kế bí mật, hợp đồng cho phép mã hóa lưu trữ | **AES-256-GCM trước khi upload ở cả GitHub & Drive**; bắt buộc có key riêng và quyền lưu hợp pháp |
| `RESTRICTED` | khóa truy cập, dữ liệu thuộc diện cấm chuyển kho, thông tin có điều kiện pháp lý đặc biệt | **Mặc định chặn**, không đẩy nguyên văn; cần thiết kế, quyền và phê duyệt riêng |

## Cách sử dụng đã triển khai

- Mặc định artifact thuộc `INTERNAL` để giữ tương thích với PCS 3.0; AI phải **chủ động phân loại dựa trên nội dung thật**, không dựa vào mặc định khi có dữ liệu nhạy cảm.
- Với `CONFIDENTIAL`, tạo khóa 32 byte: `openssl rand -base64 32`. Lưu khóa trong secret manager hoặc biến môi trường `PCS_ARTIFACT_KEY_B64` ở môi trường tin cậy. **Không dán khóa vào hội thoại, issue, commit hoặc file hướng dẫn.** Đảm bảo backup khóa theo chính sách của chủ dự án.
- Ví dụ CLI: `node runtime/pcs3.mjs artifact --slug=project-1 --file=report.pdf --expect=1 --classification=CONFIDENTIAL`.
- Artifact đã mã hóa sử dụng AES-256-GCM; GitHub và Drive chỉ nhận ciphertext. Tên tệp ở kho được thay bằng tên trung tính. Mã nguồn có hàm giải mã `decodeConfidentialArtifact()`; cần đúng khóa và project slug.
- Scanner mặc định chặn một số mẫu credential độ tin cậy cao và tên file nguy hiểm (`.env`, private key...). Đây **không phải DLP hoàn chỉnh**: SRS có thể chứa dữ liệu cá nhân trong DOCX/PDF nén hoặc khóa thuộc loại chưa nhận diện. Phải có review của agent/người chịu trách nhiệm trước khi lưu.
- Chỉ mã hóa binary artifact `CONFIDENTIAL`; **PCS HEAD, task notes, prompt, decision, đường dẫn và dữ liệu metadata chưa được mã hóa**. Không ghi thông tin mật vào các trường đó. Mã hóa file không đồng nghĩa toàn bộ dự án được mã hóa.

## Quy tắc chuyển nền tảng

ChatGPT/Claude/Gemini và connector khác có thể có cơ chế lưu giữ dữ liệu riêng. Trước khi gửi nội dung mật cho một nền tảng AI, cần kiểm tra chính sách tổ chức, cơ chế chia sẻ dữ liệu, yêu cầu tuân thủ và quyền của người dùng. Không upload để “thử” khi chưa được phép.

## Ranh giới hiện chưa hỗ trợ

- Không có KMS, xoay vòng khóa, phân quyền giải mã theo người dùng, mã hóa tìm kiếm, DLP cho PDF/DOCX, phát hiện PII tự động, quyền xóa vĩnh viễn lịch sử Git/Drive.
- Không được dùng chức năng mã hóa này như bằng chứng tuân thủ dữ liệu nhạy cảm hoặc bảo mật cấp doanh nghiệp.
- Khi nghi bị lộ khóa: ngừng upload, thu hồi quyền truy cập, tạo khóa mới, **mã hóa lại các artifact cũ** theo quy trình có kiểm soát; thay biến môi trường đơn thuần sẽ khiến bản cũ không đọc được.
