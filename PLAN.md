# Content Audit Pro - Build Plan

This document summarizes the implementation plan for `content-audit-pro`.

Goal: build a modular content audit tool that can run from CLI first, then grow into a VPS-hosted web UI later.

Version 1 must be audit-only. It must not automatically edit WordPress, create redirects, noindex pages, or delete content.

---

## 1. Product Goal

`content-audit-pro` audits website content and produces a practical action plan.

It should help identify:

- Thin content
- Missing or weak metadata
- Weak heading structure
- Stale content
- Duplicate titles or meta descriptions
- Similar/overlapping articles
- Potential keyword cannibalization
- Internal linking issues
- Pages that need update, merge review, noindex review, or manual cleanup

The tool should generate reports that can be sent to clients or used internally by an SEO/content team.

---

## 2. Core Principle

Separate deterministic server logic from LLM judgment.

### Server logic handles measurable facts

- Fetch URLs from sitemap, URL list, or WordPress REST API
- Crawl/fetch page HTML
- Extract title, meta description, canonical, H1-H3, links, word count, images, dates, taxonomy
- Score each URL using rule-based checks
- Detect exact duplicates and simple near-duplicates
- Build basic topic clusters
- Generate JSON, CSV, Markdown, and HTML reports

### LLM handles semantic judgment only when needed

- Search intent analysis
- Pillar page selection inside a cluster
- Merge/update/noindex recommendation for ambiguous clusters
- E-E-A-T and topical depth review
- Rewrite outline or merge plan

Do not send every page to the LLM. Use `llm-policy.mjs` to decide which pages/clusters deserve token usage.

---

## 3. Recommended Repository Structure

```txt
content-audit-pro/
  package.json
  README.md
  .gitignore
  .env.example
  PLAN.md

  docs/
    CONTENT_AUDIT_CORE_LOGIC.md
    CONTENT_AUDIT_BUILD_CHECKLIST.md

  scripts/
    content-audit/
      content-audit.mjs

      lib/
        cli-args.mjs
        logger.mjs
        paths.mjs

        fetch-sitemap.mjs
        fetch-url-list.mjs
        fetch-wordpress.mjs

        normalize-url.mjs
        extract-page.mjs
        content-hash.mjs

        score-rules.mjs
        severity.mjs
        cluster-pages.mjs
        recommend-actions.mjs
        llm-policy.mjs

        cache.mjs
        llm-client.mjs

        report-json.mjs
        report-csv.mjs
        report-md.mjs
        report-html.mjs

      config/
        default-thresholds.json
        action-taxonomy.json

      prompts/
        content-cluster-review.v1.md
        page-quality-review.v1.md

  audits/
    content/
      .gitkeep

  samples/
    urls.txt
    sample-inventory.json

  tests/
    normalize-url.test.mjs
    score-rules.test.mjs
    cluster-pages.test.mjs
```

---

## 4. Layered Architecture

Keep each layer independent so the tool can be adjusted later without rewriting everything.

### Input layer

Files:

- `fetch-sitemap.mjs`
- `fetch-url-list.mjs`
- `fetch-wordpress.mjs`

Responsibilities:

- Collect URLs from different sources
- Normalize input
- Apply limit
- Return URL list

### Extraction layer

Files:

- `extract-page.mjs`
- `normalize-url.mjs`
- `content-hash.mjs`

Responsibilities:

- Fetch page HTML
- Extract SEO/content fields
- Compute content fingerprints

### Analysis layer

Files:

- `score-rules.mjs`
- `severity.mjs`
- `cluster-pages.mjs`
- `llm-policy.mjs`

Responsibilities:

- Score each page
- Assign severity
- Detect duplicate/overlap clusters
- Decide whether LLM review is needed

### Decision layer

Files:

- `recommend-actions.mjs`
- `llm-client.mjs`
- `cache.mjs`

Responsibilities:

- Recommend actions
- Call LLM only when needed
- Reuse cached decisions
- Mark destructive actions as requiring human approval

### Output layer

Files:

- `report-json.mjs`
- `report-csv.mjs`
- `report-md.mjs`
- `report-html.mjs`

Responsibilities:

- Generate reports
- Keep server facts separate from LLM judgments
- Produce files usable by clients and internal teams

---

## 5. CLI Target

Primary command:

```bash
node scripts/content-audit/content-audit.mjs \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 100 \
  --out audits/content/2026-05-23/example-com
```

Later command with LLM:

```bash
node scripts/content-audit/content-audit.mjs \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 100 \
  --use-llm \
  --llm-model gpt-4.1-mini \
  --cache .cache/content-audit \
  --out audits/content/2026-05-23/example-com
```

---

## 6. MVP Phases

## Phase 0 - Project Bootstrap

Goal: make the repo a runnable Node.js project.

Create:

- `package.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `scripts/content-audit/content-audit.mjs`
- `scripts/content-audit/lib/cli-args.mjs`

Install minimal dependencies:

```bash
npm install commander cheerio fast-xml-parser slugify
```

Done when:

```bash
node scripts/content-audit/content-audit.mjs --help
```

prints usable CLI help.

---

## Phase 1 - URL Collection

Goal: collect URLs from sitemap or URL list.

Build:

- `fetch-sitemap.mjs`
- `fetch-url-list.mjs`
- `normalize-url.mjs`

Output:

- `inventory.urls.json`

Done when:

- Tool can read a sitemap
- Tool can limit URL count
- Tool saves normalized URLs to output folder

---

## Phase 2 - Page Extraction

Goal: crawl pages and extract content inventory.

Build:

- `extract-page.mjs`
- `content-hash.mjs`
- `paths.mjs`
- `logger.mjs`

Extract fields:

```json
{
  "url": "",
  "status": 200,
  "canonical": "",
  "title": "",
  "meta_description": "",
  "h1": [],
  "h2": [],
  "h3": [],
  "word_count": 0,
  "internal_links": [],
  "external_links": [],
  "images_total": 0,
  "images_missing_alt": 0,
  "published_at": null,
  "modified_at": null,
  "category": null,
  "tags": [],
  "content_hash": ""
}
```

Output:

- `inventory.json`

Done when:

- Tool crawls 10-50 URLs
- Each URL has useful extracted fields

---

## Phase 3 - Rule-Based Scoring

Goal: score pages without AI.

Build:

- `config/default-thresholds.json`
- `score-rules.mjs`
- `severity.mjs`

Use 100-point rubric:

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
80-100: healthy
60-79: needs_review
40-59: weak
0-39: high_risk
```

Output:

- `rule_findings.json`

Done when:

- Every URL has `server_score`, `severity`, and `server_flags`

---

## Phase 4 - Duplicate And Cluster Detection

Goal: find overlapping pages and possible cannibalization risks.

Build:

- `cluster-pages.mjs`

Detect:

- Duplicate title
- Duplicate meta description
- Similar slug
- Similar H1/H2 set
- Simple keyword overlap

Output:

- `clusters.json`

Cluster schema:

```json
{
  "cluster_id": "cluster-example-topic",
  "topic_hint": "example topic",
  "urls": [],
  "risk": "medium",
  "server_reason": "Similar title and overlapping headings",
  "cluster_hash": ""
}
```

Done when:

- Similar URLs are grouped into clusters
- Each cluster has risk and reason

---

## Phase 5 - Non-AI Action Plan

Goal: produce a useful content cleanup plan before adding LLM.

Build:

- `recommend-actions.mjs`

Initial actions:

```txt
KEEP
UPDATE
REVIEW_CLUSTER
REVIEW_NOINDEX
REVIEW_REDIRECT
```

Avoid direct destructive actions in early MVP.

Output:

- `content_action_plan.csv`

CSV columns:

```txt
url, score, severity, flags, cluster_id, recommended_action, requires_human_approval, notes
```

Done when:

- A human can open the CSV and know what to fix first

---

## Phase 6 - Reports

Goal: generate client-friendly outputs.

Build:

- `report-json.mjs`
- `report-csv.mjs`
- `report-md.mjs`
- `report-html.mjs`

Generate:

- `inventory.csv`
- `inventory.json`
- `rule_findings.json`
- `clusters.json`
- `content_action_plan.csv`
- `content_audit_report.md`
- `content_audit_report.html`

Report sections:

- Executive summary
- URL inventory
- Score distribution
- High-risk pages
- Duplicate/overlap clusters
- Pages needing update
- Merge/review candidates
- Noindex review candidates
- Recommended next actions
- Safety note

Done when:

- HTML report can be opened in a browser
- CSV can be used as a working action plan

---

## Phase 7 - Cache And Re-Audit

Goal: make repeated audits cheaper and more useful.

Build:

- `cache.mjs`

Cache:

- Page content hash
- Title hash
- Cluster hash
- Previous score
- Previous flags
- Previous decision

Later LLM cache must include:

- `content_hash`
- `cluster_hash`
- `rubric_version`
- `prompt_version`
- `llm_model`
- LLM input/output

Done when:

- Re-running the same audit can detect unchanged, changed, new, fixed, and persistent issues

---

## Phase 8 - LLM Needed Policy

Goal: decide what deserves AI review.

Build:

- `llm-policy.mjs`

Set `llm_needed = true` when:

- Cluster has multiple similar pages
- Server cannot safely decide merge/update/noindex
- Page has business value but weak score
- Intent or topical depth judgment is needed
- Rewrite outline or merge plan is needed

Set `llm_needed = false` when:

- Issue is purely measurable
- Page is healthy
- Cached valid LLM decision exists

Output:

- `llm_candidates.json`

Done when:

- Tool can decide which pages/clusters should use LLM before any API call

---

## Phase 9 - LLM Client And Prompt Contracts

Goal: add AI review safely and cheaply.

Build:

- `llm-client.mjs`
- `prompts/content-cluster-review.v1.md`
- `prompts/page-quality-review.v1.md`

Rules:

- LLM must return JSON only
- Log every LLM call
- Cache every LLM result
- Never let LLM directly mutate WordPress or files
- Keep prompt version and model in output

Output:

- `llm_decisions.json`

Done when:

- AI reviews only selected clusters/pages
- Results are cached and reusable

---

## Phase 10 - WordPress REST API Read-Only

Goal: improve inventory quality for WordPress sites.

Build:

- `fetch-wordpress.mjs`

Read-only endpoints:

- `/wp-json/wp/v2/posts`
- `/wp-json/wp/v2/pages`
- `/wp-json/wp/v2/categories`
- `/wp-json/wp/v2/tags`

Do not add write actions yet.

Done when:

- Tool can collect publish date, modified date, category, tag, slug, and status more reliably from WordPress

---

## Phase 11 - VPS Web UI

Goal: make the tool usable through browser after CLI is stable.

Add later:

```txt
server/
  app.mjs
  routes/
    audit-routes.mjs
    report-routes.mjs
  views/
    index.html
    report.html
```

UI features:

- Input domain/sitemap
- Run audit
- View report
- Download CSV/HTML/Markdown

Important:

- UI must call existing audit modules
- Do not duplicate audit logic inside UI

---

## 7. Suggested Coding Order

```txt
1. package.json
2. scripts/content-audit/content-audit.mjs
3. scripts/content-audit/lib/cli-args.mjs
4. scripts/content-audit/lib/paths.mjs
5. scripts/content-audit/lib/fetch-sitemap.mjs
6. scripts/content-audit/lib/fetch-url-list.mjs
7. scripts/content-audit/lib/normalize-url.mjs
8. scripts/content-audit/lib/extract-page.mjs
9. scripts/content-audit/lib/content-hash.mjs
10. scripts/content-audit/config/default-thresholds.json
11. scripts/content-audit/lib/score-rules.mjs
12. scripts/content-audit/lib/severity.mjs
13. scripts/content-audit/lib/report-json.mjs
14. scripts/content-audit/lib/report-csv.mjs
15. scripts/content-audit/lib/report-md.mjs
16. scripts/content-audit/lib/report-html.mjs
17. scripts/content-audit/lib/cluster-pages.mjs
18. scripts/content-audit/lib/recommend-actions.mjs
19. scripts/content-audit/lib/cache.mjs
20. scripts/content-audit/lib/llm-policy.mjs
21. scripts/content-audit/lib/llm-client.mjs
22. scripts/content-audit/lib/fetch-wordpress.mjs
```

---

## 8. MVP Done Definition

The first useful MVP is done when:

- One CLI command can run an audit
- The tool audits at least 50 URLs
- It generates JSON, CSV, Markdown, and HTML reports
- It separates server facts from LLM judgments
- It can identify thin, stale, duplicate, and weak pages
- It can group possible overlap clusters
- It outputs a practical action plan
- It does not perform destructive actions

---

## 9. Safety Rules

Always follow these rules:

- No automatic WordPress mutation in V1
- No automatic redirect creation
- No automatic noindex push
- No automatic delete
- Every destructive recommendation must have `requires_human_approval = true`
- Reports must separate server facts from LLM judgments
- Every LLM call must be logged with prompt version and input fingerprint
- Reuse cache when content, cluster, rubric, and prompt version are unchanged

---

## 10. Immediate Next Step

Start with MVP 1:

- Bootstrap Node.js project
- Add CLI
- Add sitemap parser
- Add URL normalizer
- Add simple page extractor
- Generate `inventory.json`

First test command:

```bash
node scripts/content-audit/content-audit.mjs \
  --url https://lalavn.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/lalavn-test
```

First useful output:

```txt
inventory.json
```
