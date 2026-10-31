# [PCS GOVERNANCE] Ủy quyền/đổi Lead Agent

<!-- pcs-lead-governance -->

Chủ dự án có thể ủy quyền một agent đã được duyệt làm Lead trong thời hạn có giới hạn:

`/pcs designate-lead AGENT01 7d`

Hoặc thu hồi:

`/pcs clear-lead AGENT01`

Các lệnh này chỉ có hiệu lực sau khi xác minh bình luận của Owner qua GitHub API và cập nhật thành công PCS state/PCS Moment. Không đăng token vào đây.
