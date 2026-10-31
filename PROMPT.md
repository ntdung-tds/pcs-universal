# PROMPT PCS — Sao chép để dùng ngay

**Mục đích:** Dán vào ChatGPT, Claude, Gemini hoặc AI phù hợp. Đính kèm SRS/SOW/đề cương nếu có; không có file thì chỉ cần gõ yêu cầu dự án.

## Prompt chuẩn (khuyến nghị)

```text
Hãy triển khai dự án này theo SRS, SOW, đề cương hoặc yêu cầu tôi cung cấp.

Sử dụng bộ PCS tại: https://github.com/ntdung-tds/pcs-universal
Trước tiên hãy đọc START_HERE.md trong repository này, sau đó chủ động tìm đọc những hướng dẫn, công cụ PCS thực sự liên quan đến công việc.

Tự phân tích yêu cầu, nghiên cứu, lập kế hoạch, thiết kế kiến trúc tổng thể, phát triển, tích hợp, kiểm thử và hoàn thiện sản phẩm trong phạm vi công cụ và quyền được cấp. Quan tâm các liên kết giữa phân hệ, bảo mật, tính đúng đắn và khả năng bảo trì. Hãy tự lựa chọn giải pháp tốt; không bị giới hạn bởi một cách triển khai hoặc ngân sách token cố định.

GitHub là nguồn lưu trữ và quản lý trạng thái chính: khi có quyền, hãy tạo hoặc sử dụng repository dự án riêng tư phù hợp; ghi tiến độ, quyết định, bằng chứng, PCS Moment và mã nguồn. Google Drive dùng lưu tài liệu, media và bằng chứng nếu được kết nối và được phép. Nếu Drive không khả dụng, lưu dữ liệu được phép lên GitHub theo chính sách bảo mật. Không đưa dữ liệu mật hoặc khóa truy cập lên repository công khai.

Tự kiểm tra các kết nối cần thiết (GitHub, Drive, môi trường chạy và dịch vụ khác). Nếu thiếu quyền, chỉ hỏi tôi cách cấp quyền đúng lúc, không yêu cầu thiết lập thừa, không tự nhận đã kết nối hoặc đã lưu khi chưa xác minh. Trước thao tác nguy cơ cao hoặc thay đổi production, cần có phê duyệt phù hợp.

Tự quản lý trạng thái và điểm tiếp tục; sau mỗi chặng quan trọng, thông báo ngắn gọn phần đã làm, phần đã kiểm chứng, phần còn thiếu và bước tiếp theo. Không đánh dấu chức năng hoàn tất nếu các phụ thuộc liên quan hoặc kiểm thử bắt buộc chưa đạt.

Bắt đầu ngay từ những gì đang có.
```

## Prompt rất ngắn (khi AI đã biết PCS)

```text
Hãy triển khai dự án này theo PCS tại https://github.com/ntdung-tds/pcs-universal (đọc START_HERE.md). Chủ động thực hiện, kiểm thử, bảo mật, lưu kết quả và PCS Moment trên GitHub; dùng Google Drive nếu có. Chỉ hỏi tôi khi cần quyền hoặc quyết định quan trọng.
```

## Prompt tiếp tục dự án

```text
Hãy tiếp tục dự án hiện tại theo PCS tại https://github.com/ntdung-tds/pcs-universal. Trước khi sửa, đọc repository dự án, revision và PCS Moment mới nhất; kiểm tra thay đổi từ phiên/agent khác, tiếp tục chính xác phần đang dở, kiểm thử, rồi lưu trạng thái và bước tiếp theo.
```

**Lưu ý:** Đường dẫn `https://github.com/ntdung-tds/pcs-universal` chỉ có hiệu lực **sau khi repository công khai được tạo và các tệp đã được đăng lên GitHub**. AI không thể tự tạo/ghi repository nếu ứng dụng chưa cấp công cụ/quyền.
