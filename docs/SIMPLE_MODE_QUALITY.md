# Quản lý dự án chất lượng cao trong Simple Mode

Mục tiêu: **quản lý thật, không phải checklist hình thức**. Bằng chứng, tiến độ và nghiệm thu đều được gắn với mã nguồn/review/test thích hợp. Người dùng không cần điều hành các công cụ nội bộ này.

| Tầng | Điều kiện hoàn thành phù hợp | Cách xác minh |
|---|---|---|
| Task | Deliverable + DoD đạt; QA phù hợp loại task | Commit/PR, test run hoặc review có nguồn |
| Feature | Các required_tasks đã nghiệm thu + tích hợp PASS | Integration test, kiểm tra quyền/dữ liệu |
| Business Flow | Required_features đã nghiệm thu + E2E PASS | Luồng nghiệp vụ thật, phiên bản môi trường |
| Release | Required_flows hoàn thành, bảo mật và rollback hợp lệ | CI/release checks, quyết định phát hành |

**Đặt điều kiện theo rủi ro, không áp dụng quy trình cứng**: nghiên cứu cần review; mã xác thực cần security negatives; migration cần rollback; UI cần kiểm tra giao diện; module liên phân hệ cần contract/integration test. Không dùng một kết quả unit test để thay cho E2E.

## Tiến độ và quản trị

- Mỗi mục tiêu có người chịu trách nhiệm (owner/agent), mức ưu tiên, tiêu chí nghiệm thu, trạng thái và phụ thuộc có lý do.
- Có danh sách mốc/milestones, rủi ro/biện pháp, quyết định (ADR), change requests khi phạm vi đổi đáng kể; chi phí/ngân sách khi dự án thực sự yêu cầu. Không bắt điền trường trống vô nghĩa.
- Tách **trạng thái công việc** khỏi **QA**, **triển khai** và **phê duyệt**. Không tự suy diễn QA PASS vì PR merge.
- `pcs/STATE.json` là canonical. GitHub Issues/Projects cho tương tác và nhìn tiến độ; mỗi issue chứa task ID. Nếu lệch phải đối soát.
- Với GitHub Projects không thể truy cập, tự động dùng Issues và file state; không để phụ thuộc UI chặn dự án.
- Snapshot sau milestones, lúc bàn giao/chuyển AI, trước migration lớn. Dùng Git history + SHA/PR review làm dấu vết kiểm toán; **không tự nhận Simple Mode có append-only CAS như Advanced Mode**.

## Các rủi ro còn phải xử lý bằng công cụ và sự thật

- Ghi trạng thái bằng connector sau khi dự án khác đã cập nhật: phải đọc lại SHA và phát hiện conflict (GitHub Contents API thường yêu cầu SHA cũ khi update); không force push.
- Evidence nguồn ngoài (CI, Drive, phê duyệt) phải đọc và xác thực quyền; metadata tự khai không đủ.
- Với dự án quan trọng, nên cài CI gồm test, security audit và validator trạng thái; Simple Mode chỉ là thiết kế tác nghiệp khi chưa có CI.
- Khi cần nhiều writer, atomic checkpoint và kiểm toán, chuyển Advanced Mode có kế hoạch — không kết hợp hai chế độ song song trong cùng một repo mà không có migration.
