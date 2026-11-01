# PROMPT PCS — Sao chép để dùng ngay

**Mục đích:** Dán vào ChatGPT, Claude, Gemini hoặc AI phù hợp. Đính kèm SRS/SOW/đề cương nếu có; không có file thì chỉ cần gõ yêu cầu dự án.

## Prompt chuẩn (khuyến nghị)

```text
Hãy triển khai hoặc tiếp tục dự án theo yêu cầu/SRS của tôi với PCS Multi-Agent tại https://github.com/ntdung-tds/pcs-universal.

Đầu tiên chỉ đọc START_HERE.md của PCS; các tài liệu, mã runtime và lịch sử khác chỉ mở khi công việc thực sự cần. Không đọc toàn bộ PCS repository. Nếu dự án đã tồn tại, ưu tiên đọc pcs/MOMENT.md trước, đối chiếu revision với pcs/STATE.json rồi chỉ truy vấn các phần trạng thái liên quan, yêu cầu và phần mã nguồn liên quan trong repository RIÊNG của dự án. Với dự án mới, làm theo hướng dẫn khởi tạo được chỉ rõ trong START_HERE.md.

Tự phân tích, thiết kế, lập kế hoạch, phát triển, tích hợp và kiểm thử trong phạm vi công cụ/quyền thực. Lead điều phối contributor khi có tham gia, review kỹ thuật và giao việc thông thường trong phạm vi Owner đã ủy quyền; chỉ dùng cơ chế cộng tác/đề xuất/phê duyệt trong PCS khi có tình huống đó. Tôi là Owner, đánh giá feature/luồng/mốc/release qua kết quả và bằng chứng, không cần duyệt từng task thường.

GitHub là nguồn trạng thái dự án khi có quyền, mặc định repo dự án private; Google Drive chỉ dùng khi đã kết nối và phân loại dữ liệu cho phép. Không giả mạo test, permission, phê duyệt hay triển khai. Đối với production, IAM, xóa dữ liệu, chi phí và rủi ro nhạy cảm/không rõ, phải xác minh đúng thẩm quyền. Không bypass branch protection.

Định kỳ cập nhật STATE và PCS Moment một cách nhất quán, kiểm tra commit thực tế, rồi báo ngắn gọn kết quả, link minh chứng, blocker và hành động tiếp theo. Chất lượng và an toàn quan trọng hơn giảm token.
```

## Prompt rất ngắn (khi AI đã biết PCS)

```text
Hãy triển khai dự án này theo PCS tại https://github.com/ntdung-tds/pcs-universal (chỉ đọc START_HERE.md trước; mở tài liệu chuyên biệt theo đúng tình huống). Chủ động thực hiện, kiểm thử, bảo mật, lưu kết quả và PCS Moment trên GitHub; dùng Google Drive nếu có. Chỉ hỏi tôi khi cần quyền hoặc quyết định quan trọng.
```

## Prompt tiếp tục dự án

```text
Hãy tiếp tục dự án hiện tại theo PCS tại https://github.com/ntdung-tds/pcs-universal. Trước khi sửa, đọc `pcs/MOMENT.md` mới nhất, đối chiếu revision/HEAD và truy vấn mục liên quan trong `pcs/STATE.json`; kiểm tra thay đổi từ phiên/agent khác, tiếp tục chính xác phần đang dở, kiểm thử, rồi lưu trạng thái và bước tiếp theo.
```

**Lưu ý:** Repository PCS đã được công khai. Đây là nơi **đọc tiêu chuẩn**, không phải nơi lưu dữ liệu dự án. Kết nối GitHub tùy theo công cụ được cấp và chỉ yêu cầu bạn cấp quyền khi cần; nếu không ghi được, AI phải báo rõ `PERSISTENCE_BLOCKED`. Không tự nhận đã triển khai sản phẩm nếu chưa có bằng chứng thực.


## Prompt agent mới xin tham gia (không cố định nhiệm vụ)

```text
Tôi muốn tham gia dự án với tư cách agent mới, chưa được giao sẵn nhiệm vụ.
PCS: https://github.com/ntdung-tds/pcs-universal
Repository dự án: [DÁN URL REPOSITORY RIÊNG TƯ]

Hãy đọc START_HERE.md của PCS, trạng thái/backlog dự án, rồi docs/AGENT_COLLABORATION.md vì nhiệm vụ này liên quan việc tham gia.

Bạn có thể (1) tự đề xuất những nhiệm vụ chưa có người phụ trách phù hợp với năng lực thực tế, (2) xin Lead Agent phân công, hoặc (3) chờ chủ dự án chỉ định. Không được tự cho mình quyền hoặc nhiệm vụ; đăng ký qua GitHub Issue, chờ chủ dự án hoặc Lead được ủy quyền duyệt và PCS ghi trạng thái thành công.

Khi được giao, làm trên branch riêng, kiểm thử và tạo PR để bàn giao. Không sửa mã của agent khác, không tự merge nhánh chính hoặc thay đổi kiến trúc chung ngoài phạm vi được cấp.
```

## Prompt chủ dự án hoặc Lead phân công một agent đã tham gia

```text
Hãy đọc START_HERE.md, trạng thái dự án và docs/AGENT_COLLABORATION.md, kiểm tra danh sách agent cùng các đề xuất đang chờ. Tôi muốn [duyệt / từ chối / giao task / thu hồi nhiệm vụ] cho agent [MÃ AGENT].
Hãy kiểm tra quyền phê duyệt theo docs/AGENT_COLLABORATION.md, đối soát GitHub Issues/comment thực tế và chỉ ghi thay đổi khi có bằng chứng đủ quyền. Nếu cần xác nhận trên GitHub, cho tôi đúng link Issue và lệnh bình luận cần dùng. Không giả mạo chữ ký hoặc phê duyệt của chủ dự án.
```
