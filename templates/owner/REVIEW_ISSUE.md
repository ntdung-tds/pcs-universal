# [PCS OWNER REVIEW] Xem kết quả và phản hồi

<!-- pcs-owner-review:release:R1 -->

> **Mẫu ví dụ:** Thay `release:R1` bằng đúng `feature:Fx`, `flow:FLx` hoặc `release:Rx`. Không dùng marker ví dụ khi chưa tạo đúng sản phẩm.

**Kết quả cho Owner xem:** [URL bản demo/preview hoặc tài liệu]

**Commit SHA đang xem:** [40 ký tự SHA của repository dự án]

**Tóm tắt:** [Những gì đã hoàn thành, các ảnh hưởng chính, hình ảnh/test link]

**Lead đã nghiệm thu kỹ thuật:** [URL Pull Request, review, CI; không giả định chỉ vì Issue đã đóng]

### Bạn chỉ cần phản hồi trong chat nếu muốn góp ý nhanh

- "Ổn rồi, tiếp tục"
- "Sửa lại phần ... trước"
- "Chưa đúng ý tôi, làm lại ..."

Phản hồi chat là chỉ dẫn về sản phẩm, **không tự trở thành phê duyệt GitHub đã được xác thực**.

### Nếu cần ghi nghiệm thu có chứng cứ GitHub

Đăng nhập bằng tài khoản Owner được xác thực và bình luận **một** trong các lệnh sau với đúng scope, target, SHA của bản được xem:

```text
/pcs agree release R1 0123456789abcdef0123456789abcdef01234567
/pcs changes release R1 0123456789abcdef0123456789abcdef01234567
/pcs disagree release R1 0123456789abcdef0123456789abcdef01234567
```

Không cần thao tác này cho mọi chỉnh sửa UX thông thường. PCS không tự cho phép production hoặc bỏ qua rulesets chỉ vì lệnh được viết.
