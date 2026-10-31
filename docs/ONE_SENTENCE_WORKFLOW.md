# Từ “Hãy triển khai dự án này” đến sản phẩm có kiểm chứng

## Những việc người dùng cần làm

**Lần đầu cho mỗi AI app:** cấp quyền GitHub tới một repository PCS **private**, optionally Google Drive; thêm/đăng ký hướng dẫn PCS một lần (Plugin Skill, Claude Project, Gemini Gem). Một số app không hỗ trợ ghi GitHub; khi đó tự động đồng bộ chỉ khả thi qua integration/runtime có quyền. Không cần người dùng tự copy Starter vào mỗi project.

**Mỗi dự án:** đính kèm SRS/đề cương hoặc mô tả mục tiêu và nói: “Hãy xây dựng dự án này”. Người dùng phê duyệt những thay đổi lớn về scope, truy cập, triển khai production hoặc rủi ro dữ liệu khi được hỏi.

## Agent làm việc như thế nào

0. Xác định repo/project. Nếu chưa có repo, xin lựa chọn/tạo repo private có xác nhận thay vì chọn nhầm sản phẩm.
1. Kiểm tra kết nối GitHub. Nếu không có quyền ghi, vẫn có thể lập kế hoạch và tài liệu tạm, nhưng đánh dấu `PERSISTENCE_BLOCKED` (không tuyên bố PCS lưu bền vững).
2. Kiểm tra Drive; không dùng được thì dùng GitHub. Upload SRS thật, ghi metadata/hash, checkpoint ngay.
3. Phân tích yêu cầu (functional/NFR/security/dependencies), xác định missing assumptions, product map, architecture map, luồng end-to-end, acceptance criteria, risk register.
4. Tự đưa ra thiết kế/stack phù hợp, phân tách task và feature; kiểm tra kiến trúc, hợp đồng và phạm vi tác động; tự thực hiện theo khả năng của công cụ.
5. Thử nghiệm, review, sửa lỗi. Tránh “TECH_DONE == ACCEPTED”. Ghi bằng chứng thật (CI URL, commit SHA, test artifacts, reviewer ID).
6. Khi chuyển phiên hoặc ngừng, cập nhật GitHub Moment và đính kèm exact next action. AI khác mở cùng project sẽ dùng HEAD/revision mới nhất.

## Kịch bản chuyển ứng dụng

- ChatGPT phân tích SRS, tạo project `crm-portal` và ghi checkpoint r5 trên GitHub.
- Claude mở cùng repository, đọc `pcs3/projects/crm-portal/HEAD.json`, xác minh version và tiếp tục trên nhánh phù hợp; tạo checkpoint r6.
- Gemini có thể đọc tài liệu Drive và review kiến trúc. Nếu Gem không thể ghi GitHub, chỉ tạo báo cáo/review có thể tải, nhờ một phiên AI có quyền ghi đưa nội dung vào GitHub; **không hứa** r7 đã được ghi.
- Tất cả liên kết GitHub/Drive chỉ hợp lệ khi quyền truy cập cho phép. Những kết quả chưa sync không được xem là trạng thái chung.

## Nếu chỉ có một câu rất ngắn

Một câu ngắn là đủ **kích hoạt quy trình** khi adapter đã được cài. Nó không bảo đảm tự xử lý những quyết định không có thông tin hay những thao tác cần quyền/approval. SRS 100 trang hoặc dự án dài hạn có thể cần nhiều phiên; PCS checkpoint giúp tiếp tục chính xác.


**PCS 3.0.2:** before submitting, read `docs/GITHUB_INBOX_MODE.md`. Large files follow `docs/LARGE_FILE_INTAKE.md`. Never load the archived v2.1 package into chatbot knowledge.
