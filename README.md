# Content Audit Pro

CLI-first content audit tool for SEO and content cleanup workflows, ưu tiên kiểm tra website tiếng Việt.

Current version: `0.1.0`.

The current MVP collects URLs from sitemap, URL list, or WordPress REST API, extracts content/SEO fields, extracts internal/external links and image alt data, scores each URL with rule-based checks, detects basic duplicate/overlap clusters, compares with the previous audit cache, identifies pages/clusters that deserve LLM review, optionally runs advisory-only LLM reviews, and generates JSON, CSV, Markdown, and HTML reports.

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
- Send pages to an LLM unless `--use-llm` is explicitly enabled

WordPress mode uses public REST API reads only. LLM output is advisory-only and always requires human judgment before applying content, redirect, merge, noindex, or deletion decisions.

## Install

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm test
```

For VPS/Linux deployment notes, see `docs/VPS_LINUX_SETUP.md`.

For release validation before tagging `v0.1.0`, see `docs/RELEASE_CHECKLIST.md`.

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

## Run With WordPress REST Read-Only

Use this when the target site is WordPress and exposes `/wp-json/wp/v2/posts` and `/wp-json/wp/v2/pages` publicly:

```bash
npm run audit -- \
  --url https://example.com \
  --source wp \
  --limit 50 \
  --out audits/content/wp-test
```

WordPress mode collects posts and pages in read-only mode and adds WordPress metadata to `inventory.json` and `inventory.csv`, including:

- `source_type`
- `wp_type`
- `wp_id`
- `wp_slug`
- `wp_status`
- `published_at`
- `modified_at`
- `category`
- `tags`

## Run With LLM Review

By default, the tool only creates `llm_candidates.json`. It does not call an LLM.

To run advisory AI review, set an API key and pass `--use-llm`:

```bash
export OPENAI_API_KEY="your-key"

npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --use-llm \
  --llm-model gpt-4.1-mini \
  --llm-max-candidates 5 \
  --out audits/content/example-test
```

You can also use `LLM_API_KEY` and override the endpoint:

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --use-llm \
  --llm-api-url https://api.openai.com/v1/chat/completions
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

LLM decisions are cached separately under:

```txt
.cache/content-audit/llm-decisions
```

Override this with `--llm-cache-dir`.

## Current Outputs

```txt
inventory.json
rule_findings.json
clusters.json
llm_candidates.json
llm_decisions.json
llm_calls.jsonl
cache_summary.json
inventory.csv
content_action_plan.csv
content_audit_report.md
content_audit_report.html
```

`inventory.json` includes URL inventory with deterministic `content_hash`, `internal_links`, `external_links`, image counts, and detailed `images` entries with `src`, `alt`, and `missing_alt`. In WordPress mode, it also includes post/page metadata such as ID, slug, status, publish date, modified date, category, and tags.

`inventory.csv` includes practical review columns such as `internal_links_count`, `external_links_count`, image counts, and `content_hash` for cache/change review.

`clusters.json` includes basic duplicate/overlap groups:

- duplicate title
- duplicate meta description
- similar slug
- similar H1
- simple Vietnamese keyword overlap

`llm_candidates.json` includes a token-saving review queue:

- page candidates that need semantic judgment
- cluster candidates that need intent/cannibalization review
- priority level
- recommended prompt contract
- review goal
- cache key

`llm_decisions.json` includes advisory-only LLM review results when `--use-llm` is enabled:

- recommendation
- confidence
- reason in Vietnamese
- suggested actions
- risks
- next review questions
- human approval requirement

`llm_calls.jsonl` logs request/response events for traceability when LLM review is enabled.

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

## First Release Readiness

This repository is prepared for a first CLI-only release target:

- `npm install`
- `npm test`
- `npm run audit -- ...`
- GitHub Actions CI on Node.js 20 and 22
- Linux/VPS setup guide in `docs/VPS_LINUX_SETUP.md`
- Release checklist in `docs/RELEASE_CHECKLIST.md`
- Changelog in `CHANGELOG.md`
- `.gitignore` excludes local audit outputs, cache, environment files, dependencies, and logs

Recommended release tag after Phase 13 is merged and validation passes:

```bash
git tag v0.1.0
git push origin v0.1.0
```

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

## WordPress REST Read-Only Source

Phase 9 adds `scripts/content-audit/lib/fetch-wordpress.mjs`.

The WordPress source:

- reads `/wp-json/wp/v2/posts`
- reads `/wp-json/wp/v2/pages`
- uses public GET requests only
- does not authenticate
- does not create, update, delete, redirect, or noindex anything
- extracts WordPress metadata for better freshness/taxonomy review
- extracts links and image alt coverage from rendered content and embedded featured media

## Content Hash And Link Extraction

Phase 10 adds `scripts/content-audit/lib/content-hash.mjs` and improves extraction for HTML and WordPress REST sources.

The content hash now uses SHA-256 over normalized content signals instead of a placeholder length/simple hash. Hash inputs include title, meta description, headings, body text, internal links, external links, image data, and relevant WordPress metadata where available.

Link extraction keeps audit behavior deterministic:

- ignores `mailto:`, `tel:`, `javascript:`, `data:`, and fragment-only links
- removes URL fragments before storing links
- classifies same-host links as internal, ignoring a leading `www.`
- stores sorted unique internal and external links

Image extraction records total image count, missing alt count, and per-image `src`, `alt`, and `missing_alt` data. WordPress mode also includes embedded featured media when available.

## LLM Needed Policy

Phase 7 adds `scripts/content-audit/lib/llm-policy.mjs`.

The policy sets `llm_needed = true` for cases such as:

- duplicate/overlap clusters
- thin or very thin content that needs topical-depth review
- stale content that may need rewrite planning
- pages with enough content but weak score
- metadata duplication that needs intent comparison

The policy avoids LLM usage for purely measurable or technical issues such as:

- fetch errors
- redirect status
- missing title/meta/H1 when the fix is straightforward
- image alt or taxonomy cleanup

## LLM Client And Prompt Contracts

Phase 8 adds:

- `scripts/content-audit/lib/llm-client.mjs`
- `scripts/content-audit/prompts/page-quality-review.v1.md`
- `scripts/content-audit/prompts/content-cluster-review.v1.md`

Rules:

- LLM must return JSON only
- LLM results are normalized before writing output
- Failed LLM calls are recorded as failed decisions instead of crashing the whole audit
- Every LLM request/response event is logged
- LLM results are cached by candidate cache key
- All recommendations are advisory-only

## Current CLI Messages

Terminal messages are Vietnamese-first and now include source, cache/delta, LLM candidate, and LLM decision summaries:

```txt
Tóm tắt nguồn dữ liệu:
- Nguồn: wp
- WordPress REST: read-only
- Posts: 40
- Pages: 10

Tóm tắt ứng viên cần AI review:
- Tổng ứng viên: 5
- Ưu tiên cao: 1
- Page candidates: 3
- Cluster candidates: 2

Tóm tắt kết quả AI review:
- Đã bật LLM: Có
- Quyết định AI: 5
- Cần người duyệt: 5

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
