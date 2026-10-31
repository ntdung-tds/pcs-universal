# Khả năng từng AI app — kiểm chứng 31/10/2026

| Ứng dụng | Hướng dẫn reusable | Truy cập GitHub / Drive | Mức đã xây trong PCS 3.0 |
|---|---|---|---|
| **ChatGPT** | Plugins/Skills là hướng dài hạn; Custom GPT đang có lộ trình chuyển đổi | Apps/Connectors theo quyền của tài khoản; GitHub/Drive cần kết nối riêng | Skill mẫu + OpenAPI Gateway + quy tắc dùng connected apps; **chưa cài plugin** |
| **Claude (chat)** | Project instructions / reusable context; Claude Connectors | Claude hỗ trợ connectors, custom remote MCP; quyền phụ thuộc tài khoản và nhà cung cấp | Project instruction; **không có MCP server production** |
| **Gemini (chat)** | Gems với instructions + Knowledge (có Drive sources nếu quyền cho phép) | Không mặc định hỗ trợ GitHub write chỉ vì đã cài Gem | Gem instruction; **tự đồng bộ GitHub bị BLOCKED nếu không có tích hợp thực tế** |
| **Claude Code/Codex/Cursor/Antigravity** | PCS 2.1 được giữ nguyên | CLI/GitHub API tùy quyền và môi trường; lưu PCS3 qua bridge | Bộ kế thừa PCS2.1 + adapter bridge |

## ChatGPT — điểm cập nhật quan trọng

Theo tài liệu OpenAI cập nhật năm 2026, Custom GPTs có lịch trình retirement; Plugins có thể chứa Skills + connected Apps, việc di trú còn tùy tài khoản. Vì vậy không xây toàn bộ PCS 3.0 dựa vào “tạo một Custom GPT” như mô hình lâu dài. Plugin Creator và các app cần thao tác cài đặt/ủy quyền từ người dùng; nội dung gói ZIP không tự trở thành plugin.

## Claude — điểm giới hạn

Claude hỗ trợ remote MCP connectors và app connectors. REST Gateway trong PCS3 **không phải** MCP server; một bên tích hợp cần adapter/proxy MCP riêng hoặc chỉ sử dụng native GitHub/Drive connectors có các thao tác phù hợp. Nên kiểm tra quyền ghi bằng thao tác an toàn trước khi hứa ghi checkpoint.

## Gemini — điểm giới hạn

Gems nhận instructions và Knowledge/Drive. Việc đọc Drive không đồng nghĩa có GitHub write tool. Nếu ứng dụng Gemini không được cấp công cụ ghi repo hay truy cập Gateway qua tích hợp được hỗ trợ, không thể tự động tạo checkpoint. Cách an toàn là export handoff để agent khác có GitHub permission nhập; **chưa phải đồng bộ tự động đa ứng dụng**.

## Tiêu chí gọi “đã tích hợp”

Chỉ khi ngay trong ứng dụng đó đã chứng minh: (1) đọc HEAD private repo; (2) ghi checkpoint CAS; (3) ghi tệp Drive hoặc fallback GH; (4) phát hiện conflict; (5) AI khác resume từ cùng GitHub — khi đó mới xem là tích hợp E2E PASS. Tài liệu cấu hình không thay thế kiểm thử.

Nguồn: https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq ; https://help.openai.com/en/articles/20001256-plugins-in-chatgpt ; https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities ; https://support.google.com/gemini/answer/15146780?hl=en


PCS 3.0.1 security note: Applications may process user-uploaded SRS before PCS ever sees it. Do not paste credentials, encryption keys, restricted PII or privileged data into a chat application unless its actual contractual/data-governance controls permit it. GitHub-only storage policy cannot override platform data-handling restrictions.
