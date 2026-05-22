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

### Phase 5 - Duplicate And Cluster Detection

- [x] Added cluster detection helper: `scripts/content-audit/lib/cluster-pages.mjs`
- [x] CLI now generates `clusters.json`
- [x] Markdown report now includes duplicate/overlap cluster section
- [x] HTML report now includes duplicate/overlap cluster section
- [x] CLI now prints Vietnamese cluster summary at the end

## Current MVP Status

The project can now run a basic inventory, scoring, report, and cluster audit:

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
audits/content/example-test/clusters.json
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

## Current Cluster Output

Each cluster in `clusters.json` includes:

- `cluster_id`
- `type`
- `topic_hint`
- `urls`
- `risk`
- `server_reason`
- `url_count`
- `cluster_hash`

Cluster detection currently checks:

- duplicate title
- duplicate meta description
- similar slug
- similar H1
- simple Vietnamese keyword overlap

## Known Limitations

- Cluster logic is still lightweight and deterministic
- No LLM policy/client yet
- WordPress REST source is not implemented yet
- Internal/external link extraction is currently a placeholder
- Content hash is currently a simple placeholder based on body text length
- `.gitignore` still needs to be added

## Next Phase

Phase 6 - Cache And Re-Audit

Planned files:

- `scripts/content-audit/lib/cache.mjs`
- update `scripts/content-audit/content-audit.mjs`
- update reports with delta summary

Planned outputs:

- cache folder for page fingerprints
- delta report for new, changed, unchanged, and persistent issues
