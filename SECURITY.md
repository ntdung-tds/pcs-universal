# PCS — Security Policy

Report suspected vulnerabilities **privately** to the repository owner/security contact using GitHub private vulnerability reporting when available. Do not publish credentials, proof-of-concept exploit data, personal information or production secrets in a public Issue.

If a credential was exposed, **revoke/rotate it immediately**, restrict the leaked access, review audit logs and incident scope, then remove leaked data from relevant sources using the approved incident process. Deleting a file from the latest Git commit does **not** remove it from history, forks, caches, prior Actions runs or previous AI chats.

Supported security baseline: PCS 3.0.1 reference toolkit. No security certification or penetration-test claims. See `docs/SECURITY_THREAT_MODEL.md`, `docs/SECURITY_ACCEPTANCE.md` and `docs/DATA_CLASSIFICATION.md`.

## Dynamic AI agent identity (2026-11-01)

PCS kiểm tra danh tính người duyệt từ GitHub Issue comment API, không tin chữ “approved” trong nội dung do agent tự khai. Chủ dự án hoặc Lead được ủy quyền duyệt công việc thường, nhưng công việc nhạy cảm chỉ Owner được duyệt. **Không thể chứng minh người thật khác agent nếu cùng sử dụng một GitHub account/token**; muốn enforce độc lập, cấp danh tính bot riêng, bảo vệ main, giới hạn quyền và xác minh owner approval. Việc sửa `pcs/STATE.json` không tự thu hồi quyền GitHub hay khóa token.

## PCS 3.1 — Independent technical and Owner acceptance

- Lead technical acceptance requires independent GitHub PR review and successful complete CI checks after PR merge, with a task-to-agent assignment and authenticated reviewer. Lead cannot accept its own PR.
- Owner feedback about the product in chat is tracked only as `UNVERIFIED_CHAT`: use it to change plans, but do not misrepresent it as verified consent for release, IAM or production changes.
- Verified Owner response is tied to a concrete GitHub Issue comment and reviewed branch SHA. It is separate from task technical status.
- No contributor can grant itself Owner rights by editing a PR description, issue text, PCS JSON or a self-declared identity. Real enforcement still depends on GitHub credential separation and protected-branch rules. Shared token access cannot prove independent consent.
- GitHub CI/mock tests for PCS 3.1 are not a penetration test or multi-provider production certification.
