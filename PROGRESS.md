# Content Audit Pro - Progress

This file tracks implementation progress in the repository.

## Completed

### Phase 0 - Project Bootstrap

- [x] Added `package.json`
- [x] Added `.env.example`
- [x] Added `README.md`
- [x] Added CLI entry file: `scripts/content-audit/content-audit.mjs`
- [x] Added CLI parser: `scripts/content-audit/lib/cli-args.mjs`

Note: `.gitignore` was attempted but the connector blocked the file creation. Add it manually or retry later.

### Phase 1 - URL Collection

- [x] Added URL normalization helper: `normalize-url.mjs`
- [x] Added sitemap reader: `fetch-sitemap.mjs`
- [x] Added URL list reader: `fetch-url-list.mjs`

### Phase 2 - Basic Page Extraction

- [x] Added HTML extraction helper: `extract-page.mjs`
- [x] CLI now fetches page HTML and generates `inventory.json`

### Phase 3 - Rule-Based Scoring

- [x] Added scoring thresholds: `scripts/content-audit/config/default-thresholds.json`
- [x] Added severity helpers: `scripts/content-audit/lib/severity.mjs`
- [x] Added rule-based scoring engine: `scripts/content-audit/lib/score-rules.mjs`
- [x] CLI now generates `rule_findings.json`
- [x] CLI now prints a Vietnamese scoring summary at the end

### Phase 4 - Reports

- [x] Added JSON report writer: `scripts/content-audit/lib/report-json.mjs`
- [x] Added CSV report builders: `scripts/content-audit/lib/report-csv.mjs`
- [x] Added Vietnamese Markdown report: `scripts/content-audit/lib/report-md.mjs`
- [x] Added Vietnamese HTML report: `scripts/content-audit/lib/report-html.mjs`
- [x] CLI now generates inventory CSV, action plan CSV, Markdown report, and HTML report

## Current MVP Status

The project can now run a basic inventory, scoring, and report audit:

```bash
npm install
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/example-test
```

Expected outputs:

```txt
audits/content/example-test/inventory.json
audits/content/example-test/rule_findings.json
audits/content/example-test/inventory.csv
audits/content/example-test/content_action_plan.csv
audits/content/example-test/content_audit_report.md
audits/content/example-test/content_audit_report.html
```

## Current Scoring Output

Each URL in `rule_findings.json` includes:

- `server_score`
- `severity`
- `severity_vi`
- `server_flags`
- `notes_vi`
- `score_sections`

The terminal summary is Vietnamese-first, for example:

```txt
Tóm tắt chấm điểm nội dung:
- Tổng URL: 20
- Điểm trung bình: 72/100
- Tốt: 5
- Cần rà soát: 10
- Yếu: 4
- Rủi ro cao: 1
```

## Current Report Output

- `inventory.csv`: bảng dữ liệu page đã extract
- `content_action_plan.csv`: action plan cho SEO/content review
- `content_audit_report.md`: báo cáo Markdown tiếng Việt
- `content_audit_report.html`: báo cáo HTML tiếng Việt có thể mở bằng browser

## Known Limitations

- No duplicate/cluster detection yet beyond duplicate title/meta scoring
- No LLM policy/client yet
- WordPress REST source is not implemented yet
- Internal/external link extraction is currently a placeholder
- Content hash is currently a simple placeholder based on body text length
- `.gitignore` still needs to be added

## Next Phase

Phase 5 - Duplicate And Cluster Detection

Planned files:

- `scripts/content-audit/lib/cluster-pages.mjs`
- update `scripts/content-audit/lib/report-md.mjs`
- update `scripts/content-audit/lib/report-html.mjs`
- update `scripts/content-audit/content-audit.mjs`

Planned outputs:

- `clusters.json`
- cluster section in Markdown/HTML reports
