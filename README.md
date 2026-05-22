# Content Audit Pro

CLI-first content audit tool for SEO and content cleanup workflows, ưu tiên kiểm tra website tiếng Việt.

Current version: `0.1.0`.

The current MVP collects URLs, fetches pages, extracts basic content/SEO fields, scores each URL with rule-based checks, detects basic duplicate/overlap clusters, compares with the previous audit cache, and generates JSON, CSV, Markdown, and HTML reports.

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

## Cache Options

Cache is enabled by default and stored under:

```txt
.cache/content-audit/<site>/last-audit.json
```

Use a custom cache folder:

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --cache-dir .cache/content-audit \
  --out audits/content/example-test
```

Disable cache:

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --no-cache \
  --out audits/content/example-test
```

## Current Outputs

```txt
inventory.json
rule_findings.json
clusters.json
cache_summary.json
inventory.csv
content_action_plan.csv
content_audit_report.md
content_audit_report.html
```

`clusters.json` includes basic duplicate/overlap groups:

- duplicate title
- duplicate meta description
- similar slug
- similar H1
- simple Vietnamese keyword overlap

`cache_summary.json` includes re-audit comparison:

- new URLs
- changed URLs
- unchanged URLs
- removed URLs
- new issues
- fixed issues
- persistent issues

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

Terminal messages are Vietnamese-first and now include cache/delta summary:

```txt
Tóm tắt so sánh với lần audit trước:
- Có cache trước đó: Có
- URL mới: 2
- URL thay đổi: 5
- URL không đổi: 13
- Vấn đề mới: 1
- Vấn đề đã xử lý: 3
- Vấn đề còn tồn tại: 4
```

## Roadmap

See:

- `PLAN.md`
- `docs/CONTENT_AUDIT_CORE_LOGIC.md`
- `docs/CONTENT_AUDIT_BUILD_CHECKLIST.md`
- `PROGRESS.md`
