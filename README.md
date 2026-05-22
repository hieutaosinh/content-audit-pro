# Content Audit Pro

CLI-first content audit tool for SEO and content cleanup workflows, ưu tiên kiểm tra website tiếng Việt.

Current version: `0.1.0`.

The current MVP collects URLs, fetches pages, extracts basic content/SEO fields, scores each URL with rule-based checks, and generates JSON, CSV, Markdown, and HTML reports.

## Language Direction

Tên file, tên module, tên field JSON và cấu trúc code dùng tiếng Anh để dễ bảo trì.

Thông báo CLI, báo cáo cuối, ghi chú hành động và các phần hướng dẫn cho người dùng cuối sẽ ưu tiên tiếng Việt.

Tool được thiết kế trước hết cho website tiếng Việt, nên các phase sau cần chú ý:

- Đếm từ phù hợp với tiếng Việt
- Nhận diện bài mỏng theo ngữ cảnh tiếng Việt
- Flag lỗi title/meta bằng tiếng Việt dễ hiểu
- Báo cáo HTML/Markdown bằng tiếng Việt
- Action plan bằng tiếng Việt cho SEO/content team

## Safety Scope

Version 1 is audit-only.

The tool does not:

- Edit WordPress content
- Create redirects
- Push noindex rules
- Delete posts/pages
- Perform destructive actions automatically

## Install

```bash
npm install
```

## Run With Sitemap

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/example-test
```

## Run With URL List

```bash
npm run audit -- \
  --url https://example.com \
  --source urls \
  --urls samples/urls.txt \
  --limit 20 \
  --out audits/content/url-list-test
```

## Current Outputs

```txt
inventory.json
rule_findings.json
inventory.csv
content_action_plan.csv
content_audit_report.md
content_audit_report.html
```

`inventory.json` includes extracted page data:

- URL
- HTTP status
- canonical
- title
- meta description
- H1/H2/H3
- word count
- image count
- missing alt count
- content hash placeholder
- fetch timestamp
- error field

`rule_findings.json` includes rule-based scoring:

- `server_score`
- `severity`
- `severity_vi`
- `server_flags`
- `notes_vi`
- `score_sections`

`content_action_plan.csv` includes practical next actions for SEO/content review.

`content_audit_report.md` and `content_audit_report.html` are Vietnamese-first summary reports.

## Scoring

The current scoring system uses a 100-point rubric:

```txt
Metadata: 15
Structure: 15
Freshness: 10
Thin content: 15
Duplicate risk: 15
Internal links: 10
Taxonomy: 10
Technical content risk: 10
```

Severity bands:

```txt
80-100: healthy / Tốt
60-79: needs_review / Cần rà soát
40-59: weak / Yếu
0-39: high_risk / Rủi ro cao
```

## Current CLI Messages

Terminal messages are Vietnamese-first, for example:

```txt
Bắt đầu kiểm tra nội dung website...
Tìm thấy 20 URL cần kiểm tra.
Đang kiểm tra: https://example.com/post/
Tóm tắt chấm điểm nội dung:
- Tổng URL: 20
- Điểm trung bình: 72/100
- Tốt: 5
- Cần rà soát: 10
- Yếu: 4
- Rủi ro cao: 1
Hoàn tất kiểm tra website.
Đã xuất inventory JSON tại: audits/content/example-test/inventory.json
Đã xuất kết quả chấm điểm tại: audits/content/example-test/rule_findings.json
Đã xuất inventory CSV tại: audits/content/example-test/inventory.csv
Đã xuất action plan CSV tại: audits/content/example-test/content_action_plan.csv
Đã xuất báo cáo Markdown tại: audits/content/example-test/content_audit_report.md
Đã xuất báo cáo HTML tại: audits/content/example-test/content_audit_report.html
```

## Roadmap

See:

- `PLAN.md`
- `docs/CONTENT_AUDIT_CORE_LOGIC.md`
- `docs/CONTENT_AUDIT_BUILD_CHECKLIST.md`
- `PROGRESS.md`
