# PCS 3.0.1 — Security gates & QA

## Các gate theo rủi ro (không ép agent vào checklist máy móc)

- **G0 Intake:** SRS/attachment đã phân loại; xác nhận có quyền đưa tài liệu vào chat/GitHub/Drive. Prompt injection từ tệp là dữ liệu không tin cậy.
- **G1 Repo:** private visibility thực tế, 2FA, scopes, branch rulesets, PR review, quyền tác giả workflow, GitHub Actions permission; record kết quả/timestamp.
- **G2 Engineering:** dependency review, secrets scan, SAST/CodeQL theo điều kiện license, test quyền server-side, negative test, audit logs không rò PII.
- **G3 Integration:** test hợp đồng API, role/tenant, migration/rollback, upload media, DLP/storage và các tuyến liên phân hệ có rủi ro.
- **G4 Release:** phê duyệt production thật, backup phục hồi, kiểm tra secret/scan critical, rollback được kiểm chứng và nhật ký bản phát hành.
- **G5 Operation:** alerts, log, kiểm tra backup/khôi phục định kỳ, incident playbook, dependency vulnerability triage và token rotation.

## Quy tắc tính trạng thái

`NOT_RUN` hoặc `BLOCKED` không được đổi thành `PASS` chỉ vì agent đã viết test; PASS phải có bằng chứng thực thi trong đúng môi trường. Không ghi rằng các cài đặt GitHub bảo mật đã bật nếu chỉ mới cung cấp YAML hoặc hướng dẫn. Dữ liệu `RESTRICTED` không tự fallback lên GitHub.

## Cách chạy tại máy / CI

```
node tools/pcs-security-audit.mjs --root=.
PCS_GITHUB_REPO=owner/private-repo PCS_GITHUB_TOKEN=... node tools/pcs-github-security-doctor.mjs
node --test tests/*.test.mjs
python VERIFY_PACKAGE.py
```

Quy tắc: `pcs-security-audit` chỉ là **baseline scanner** nhận diện một số chuỗi credential phổ biến, file `.env` và action không pin SHA. Không khẳng định đây là secret scanner đầy đủ; cần bật Github Secret Protection/Code scanning tùy tính năng có sẵn, hoặc dùng công cụ tương đương có chứng cứ chạy thật. Có thể bổ sung trivy/gitleaks/semgrep/CodeQL theo ngôn ngữ và threat model.

## Mẫu evidence

`control_id, scope, severity, test_or_setting, environment, tool, run_id, result, evidence_url, reviewer, observed_at, residual_risk`

Với critical/high không được công nhận release nếu còn issue chưa xử lý hoặc thiếu phê duyệt ngoại lệ xác thực. Exception phải có owner, expiry và compensating control, không phải lời tự kết luận của agent.

`pcs-github-security-doctor.mjs` chỉ **đọc API**, có thể trả về UNKNOWN nếu token không đủ quyền hoặc GitHub không hỗ trợ tính năng. Không xem UNKNOWN như PASS. Kết quả không tiết lộ token.
