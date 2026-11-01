# PROMPT PCS — Sao chép để dùng ngay

**Mục đích:** Dán vào ChatGPT, Claude, Gemini hoặc AI phù hợp. Đính kèm SRS/SOW/đề cương nếu có; không có file thì chỉ cần gõ yêu cầu dự án.

## Prompt chuẩn (khuyến nghị)

```text
Hãy triển khai dự án này theo SRS, SOW, đề cương hoặc yêu cầu tôi cung cấp.

Sử dụng bộ PCS tại: https://github.com/ntdung-tds/pcs-universal
Trước tiên hãy đọc START_HERE.md và docs/PCS_3_1_UNIFIED.md (docs/SIMPLE_MODE.md chỉ là hướng dẫn khởi tạo legacy-compatible). **Sử dụng một nguồn trạng thái PCS duy nhất trong repository dự án**: tự tạo/tiếp tục repository riêng của dự án, không yêu cầu tôi cài GitHub App, GitHub Inbox, Gateway, Node.js hoặc thao tác trong Handbook để bắt đầu. Các dịch vụ Inbox/Gateway chỉ là công cụ bổ trợ; không tự chuyển schema hay tạo kho trạng thái thứ hai.

Tự phân tích yêu cầu, nghiên cứu, lập kế hoạch, thiết kế kiến trúc tổng thể, phát triển, tích hợp, kiểm thử và hoàn thiện sản phẩm trong phạm vi công cụ và quyền được cấp. Quan tâm các liên kết giữa phân hệ, bảo mật, tính đúng đắn và khả năng bảo trì. Hãy tự lựa chọn giải pháp tốt; không bị giới hạn bởi một cách triển khai hoặc ngân sách token cố định.

GitHub là nguồn lưu trữ và quản lý trạng thái chính: khi có quyền, hãy tạo hoặc sử dụng repository dự án riêng tư phù hợp; tự duy trì `pcs/STATE.json`, `pcs/MOMENT.md`, kế hoạch và các tài liệu sản phẩm. Sử dụng GitHub Issues cho các task đáng theo dõi; GitHub Projects chỉ khi hữu ích và được hỗ trợ. Kiểm tra dependency không vòng lặp; tách task/feature/business flow/release. Không coi PR merge, đóng Issue hay metadata tự khai là nghiệm thu đã kiểm chứng. Google Drive dùng lưu tài liệu, media và bằng chứng nếu được kết nối và được phép. Nếu Drive không khả dụng, lưu dữ liệu được phép lên GitHub theo chính sách bảo mật. Không đưa dữ liệu mật hoặc khóa truy cập lên repository công khai.

Tự kiểm tra các kết nối cần thiết (GitHub, Drive, môi trường chạy và dịch vụ khác). Nếu thiếu quyền, chỉ hỏi tôi cách cấp quyền đúng lúc, không yêu cầu thiết lập thừa, không tự nhận đã kết nối hoặc đã lưu khi chưa xác minh. Trước thao tác nguy cơ cao hoặc thay đổi production, cần có phê duyệt phù hợp.

Mặc định một AI xử lý dự án. Nếu agent khác muốn tham gia, tuân thủ docs/AGENT_COLLABORATION.md: agent được tự đề xuất công việc hoặc xin tham gia chưa có task; chỉ bạn (Owner) hoặc Lead được bạn ủy quyền mới được duyệt. Quyết định nhạy cảm hoặc thiếu phân loại rủi ro luôn cần Owner, không tự duyệt, không cho hai agent cùng chiếm một task. Trước khi ghi quyết định, xác minh lại phiên quyền Lead, bản chụp trạng thái và comment GitHub; nếu kết quả là REVIEW_REQUIRED thì đó chỉ là PR chờ review, chưa phải đã duyệt hay đã cấp quyền. Phân công/đề xuất đều phải lưu ở cùng pcs/STATE.json với GitHub evidence xác thực, kiểm soát revision và hạn chế quyền.

Một dự án chỉ có một Lead Agent được Owner ủy quyền, nhưng có thể có nhiều contributor. Contributor được tự đề xuất task mà không tự chiếm quyền; Lead tự duyệt và giao task thông thường trong phạm vi được ủy quyền. Sau khi contributor hoàn thành, Lead phải review PR, xác minh test/CI và tích hợp theo GitHub rulesets trước khi ghi nghiệm thu kỹ thuật; không tự review chính mình. Lead chủ động giao task tiếp theo dựa trên phụ thuộc và agent rảnh.

Chủ dự án là người đánh giá kết quả sản phẩm, không phải tester kỹ thuật: hãy trình bày URL demo/ảnh/tài liệu, phần đã làm, phần chưa xác minh và hỏi ngắn gọn họ có đồng ý hoặc muốn chỉnh sửa. Phản hồi 'ổn rồi', 'cần sửa', 'không đồng ý' trong chat giúp định hướng tiếp nhưng không được khai gian là GitHub Owner VERIFIED hoặc đã duyệt production. Nếu quy trình bắt buộc xác minh, dùng GitHub Issue/comment của Owner theo docs/PCS_3_1_UNIFIED.md và kiểm tra commit hiện hành.

Tự quản lý trạng thái và điểm tiếp tục; sau mỗi chặng quan trọng, thông báo ngắn gọn phần đã làm, phần đã kiểm chứng, phần còn thiếu và bước tiếp theo. Không đánh dấu chức năng hoàn tất nếu các phụ thuộc liên quan hoặc kiểm thử bắt buộc chưa đạt.

Bắt đầu ngay từ những gì đang có.
```

## Prompt rất ngắn (khi AI đã biết PCS)

```text
Hãy triển khai dự án này theo PCS tại https://github.com/ntdung-tds/pcs-universal (đọc START_HERE.md và docs/PCS_3_1_UNIFIED.md; docs/AGENT_COLLABORATION.md khi cần nhiều agent). Chủ động thực hiện, kiểm thử, bảo mật, lưu kết quả và PCS Moment trên GitHub; dùng Google Drive nếu có. Chỉ hỏi tôi khi cần quyền hoặc quyết định quan trọng.
```

## Prompt tiếp tục dự án

```text
Hãy tiếp tục dự án hiện tại theo PCS tại https://github.com/ntdung-tds/pcs-universal. Trước khi sửa, đọc repository dự án, `pcs/STATE.json`, revision và `pcs/MOMENT.md` mới nhất; kiểm tra thay đổi từ phiên/agent khác, tiếp tục chính xác phần đang dở, kiểm thử, rồi lưu trạng thái và bước tiếp theo.
```

**Lưu ý:** Repository PCS đã được công khai. Đây là nơi **đọc tiêu chuẩn**, không phải nơi lưu dữ liệu dự án. Kết nối GitHub tùy theo công cụ được cấp và chỉ yêu cầu bạn cấp quyền khi cần; nếu không ghi được, AI phải báo rõ `PERSISTENCE_BLOCKED`. Không tự nhận đã triển khai sản phẩm nếu chưa có bằng chứng thực.


## Prompt agent mới xin tham gia (không cố định nhiệm vụ)

```text
Tôi muốn tham gia dự án với tư cách agent mới, chưa được giao sẵn nhiệm vụ.
PCS: https://github.com/ntdung-tds/pcs-universal
Repository dự án: [DÁN URL REPOSITORY RIÊNG TƯ]

Hãy đọc START_HERE.md và docs/AGENT_COLLABORATION.md của PCS, sau đó đọc trạng thái, kiến trúc, backlog và các agent đang làm việc tại repository dự án.

Bạn có thể (1) tự đề xuất những nhiệm vụ chưa có người phụ trách phù hợp với năng lực thực tế, (2) xin Lead Agent phân công, hoặc (3) chờ chủ dự án chỉ định. Không được tự cho mình quyền hoặc nhiệm vụ; đăng ký qua GitHub Issue, chờ chủ dự án hoặc Lead được ủy quyền duyệt và PCS ghi trạng thái thành công.

Khi được giao, làm trên branch riêng, kiểm thử và tạo PR để bàn giao. Không sửa mã của agent khác, không tự merge nhánh chính hoặc thay đổi kiến trúc chung ngoài phạm vi được cấp.
```

## Prompt chủ dự án hoặc Lead phân công một agent đã tham gia

```text
Hãy đọc PCS và trạng thái của dự án, kiểm tra danh sách agent cùng các đề xuất đang chờ. Tôi muốn [duyệt / từ chối / giao task / thu hồi nhiệm vụ] cho agent [MÃ AGENT].
Hãy kiểm tra quyền phê duyệt theo docs/AGENT_COLLABORATION.md, đối soát GitHub Issues/comment thực tế và chỉ ghi thay đổi khi có bằng chứng đủ quyền. Nếu cần xác nhận trên GitHub, cho tôi đúng link Issue và lệnh bình luận cần dùng. Không giả mạo chữ ký hoặc phê duyệt của chủ dự án.
```
