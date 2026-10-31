# PROMPT PCS — Sao chép để dùng ngay

**Mục đích:** Dán vào ChatGPT, Claude, Gemini hoặc AI phù hợp. Đính kèm SRS/SOW/đề cương nếu có; không có file thì chỉ cần gõ yêu cầu dự án.

## Prompt chuẩn (khuyến nghị)

```text
Hãy triển khai dự án này theo SRS, SOW, đề cương hoặc yêu cầu tôi cung cấp.

Sử dụng bộ PCS tại: https://github.com/ntdung-tds/pcs-universal
Trước tiên hãy đọc START_HERE.md và docs/SIMPLE_MODE.md. **Dùng Simple Mode mặc định**: tự tạo/tiếp tục repository riêng của dự án, không yêu cầu tôi cài GitHub App, GitHub Inbox, Gateway, Node.js hoặc thao tác trong Handbook để bắt đầu. Chỉ đề xuất Advanced Mode nếu có lý do kỹ thuật thực sự.

Tự phân tích yêu cầu, nghiên cứu, lập kế hoạch, thiết kế kiến trúc tổng thể, phát triển, tích hợp, kiểm thử và hoàn thiện sản phẩm trong phạm vi công cụ và quyền được cấp. Quan tâm các liên kết giữa phân hệ, bảo mật, tính đúng đắn và khả năng bảo trì. Hãy tự lựa chọn giải pháp tốt; không bị giới hạn bởi một cách triển khai hoặc ngân sách token cố định.

GitHub là nguồn lưu trữ và quản lý trạng thái chính: khi có quyền, hãy tạo hoặc sử dụng repository dự án riêng tư phù hợp; tự duy trì `pcs/STATE.json`, `pcs/MOMENT.md`, kế hoạch và các tài liệu sản phẩm. Sử dụng GitHub Issues cho các task đáng theo dõi; GitHub Projects chỉ khi hữu ích và được hỗ trợ. Kiểm tra dependency không vòng lặp; tách task/feature/business flow/release. Không coi PR merge, đóng Issue hay metadata tự khai là nghiệm thu đã kiểm chứng. Google Drive dùng lưu tài liệu, media và bằng chứng nếu được kết nối và được phép. Nếu Drive không khả dụng, lưu dữ liệu được phép lên GitHub theo chính sách bảo mật. Không đưa dữ liệu mật hoặc khóa truy cập lên repository công khai.

Tự kiểm tra các kết nối cần thiết (GitHub, Drive, môi trường chạy và dịch vụ khác). Nếu thiếu quyền, chỉ hỏi tôi cách cấp quyền đúng lúc, không yêu cầu thiết lập thừa, không tự nhận đã kết nối hoặc đã lưu khi chưa xác minh. Trước thao tác nguy cơ cao hoặc thay đổi production, cần có phê duyệt phù hợp.

Tự quản lý trạng thái và điểm tiếp tục; sau mỗi chặng quan trọng, thông báo ngắn gọn phần đã làm, phần đã kiểm chứng, phần còn thiếu và bước tiếp theo. Không đánh dấu chức năng hoàn tất nếu các phụ thuộc liên quan hoặc kiểm thử bắt buộc chưa đạt.

Bắt đầu ngay từ những gì đang có.
```

## Prompt rất ngắn (khi AI đã biết PCS)

```text
Hãy triển khai dự án này theo Simple Mode của PCS tại https://github.com/ntdung-tds/pcs-universal (đọc START_HERE.md và docs/SIMPLE_MODE.md). Chủ động thực hiện, kiểm thử, bảo mật, lưu kết quả và PCS Moment trên GitHub; dùng Google Drive nếu có. Chỉ hỏi tôi khi cần quyền hoặc quyết định quan trọng.
```

## Prompt tiếp tục dự án

```text
Hãy tiếp tục dự án hiện tại theo PCS tại https://github.com/ntdung-tds/pcs-universal. Trước khi sửa, đọc repository dự án, `pcs/STATE.json`, revision và `pcs/MOMENT.md` mới nhất; kiểm tra thay đổi từ phiên/agent khác, tiếp tục chính xác phần đang dở, kiểm thử, rồi lưu trạng thái và bước tiếp theo.
```

**Lưu ý:** Repository PCS đã được công khai. Đây là nơi **đọc tiêu chuẩn**, không phải nơi lưu dữ liệu dự án. Kết nối GitHub tùy theo công cụ được cấp và chỉ yêu cầu bạn cấp quyền khi cần; nếu không ghi được, AI phải báo rõ `PERSISTENCE_BLOCKED`. Không tự nhận đã triển khai sản phẩm nếu chưa có bằng chứng thực.
