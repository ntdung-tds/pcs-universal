# PCS 3.0.2 — Large file intake and GitHub-first preservation

## Core storage invariant

An artifact is `STORED` only when the **whole allowed content** has been persisted and verified on GitHub: Contents for supported small files, controlled GitHub Release asset for larger files. Drive is a preferred supplemental presentation/source channel. **A Drive URL, metadata record or SHA-256 alone does not satisfy the GitHub backup invariant.** For `CONFIDENTIAL`, use authenticated client-side PCS encryption before storage. `RESTRICTED` and detected keys/tokens remain blocked.

## Choose a path based on actual capabilities

| Client | Mechanism | Result |
|---|---|---|
| CLI / authorized server or Gateway | Upload bytes to PCS core (GitHub mirror, optional Drive); compare checksum | Confirm GitHub+Drive refs and checkpoint |
| Web AI with small text capability | `artifact` JSON Inbox, base64 under configured limit, non-sensitive only | Runner decodes, verifies and mirrors |
| Web AI unable to transfer large binary | User/authorized app uploads an allowed `PUBLIC`/`INTERNAL` file to designated **Drive intake folder**, supplies ID + byte length + SHA-256; AI submits `artifact_drive_ref` | Runner checks folder/metadata, downloads, verifies hash and saves GitHub bytes before ACK |
| No Drive available, binary > connector limit | Controlled upload to designated **project PCS3 GitHub draft release vault**; submit `artifact_github_asset` with ID, length, SHA-256 | Runner verifies membership in project asset vault, downloads, validates and adds canonical artifact metadata |
| No safe transport to GitHub | Do not claim success; mark `STORAGE_BLOCKED` | Safe independent work can proceed |

For large uploads via `artifact_drive_ref`, Drive access token needs permission to read that source **and** the exact configured folder. This sample rejects Google-native Docs for reference intake because they require a separately approved export and content hashing pipeline. For upload to the release vault, users/agents need suitable GitHub permission; the UI workflow for draft releases may differ by role and product. No arbitrary URL fetching is allowed (prevents SSRF).

**Conservative limits:** Inbox request body <= 800 kB; small core GitHub Contents mirror <= 800 kB; big mirrors via GitHub release assets with PCS reference cap <= 2,000,000,000 bytes. These are PCS implementation limits; not a universal assertion that all Github/AI connectors accept the same sizes. File limits, GitHub release retention, repository and organization policies must be checked at deployment.

**Security caution:** A file's declared classification is only a claim. PCS uses limited high-confidence secret scanning and other checks, not a complete malware scanner or legal DLP. Keep direct uploads within private, authorized boundaries. A ChatGPT/Claude/Gemini upload can itself be subject to provider data-handling policies before PCS sees the file.
