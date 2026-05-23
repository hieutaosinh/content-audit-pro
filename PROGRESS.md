# Content Audit Pro - Progress

This file tracks implementation progress in the repository.

## Completed

### Phase 0 - Project Bootstrap

- [x] Added `package.json`
- [x] Added `.env.example`
- [x] Added `README.md`
- [x] Added CLI entry file: `scripts/content-audit/content-audit.mjs`
- [x] Added CLI parser: `scripts/content-audit/lib/cli-args.mjs`

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

### Phase 6 - Cache And Re-Audit

- [x] Added cache helper: `scripts/content-audit/lib/cache.mjs`
- [x] Added `--cache-dir` and `--no-cache` CLI options
- [x] CLI now writes and reads audit cache snapshots
- [x] CLI now generates `cache_summary.json`
- [x] Markdown and HTML reports now include delta summary
- [x] CLI now prints Vietnamese cache/delta summary at the end

### Phase 7 - LLM Needed Policy

- [x] Added LLM selection policy: `scripts/content-audit/lib/llm-policy.mjs`
- [x] CLI now builds page and cluster candidates that deserve AI review
- [x] CLI now generates `llm_candidates.json`
- [x] CLI now prints Vietnamese LLM candidate summary at the end
- [x] Markdown report now includes LLM candidate summary
- [x] HTML report now includes LLM candidate summary
- [x] README now documents the LLM candidate output and safety scope

### Phase 8 - LLM Client And Prompt Contracts

- [x] Added LLM client: `scripts/content-audit/lib/llm-client.mjs`
- [x] Added prompt contract: `scripts/content-audit/prompts/page-quality-review.v1.md`
- [x] Added prompt contract: `scripts/content-audit/prompts/content-cluster-review.v1.md`
- [x] Added `--use-llm`, `--llm-model`, `--llm-api-url`, `--llm-max-candidates`, `--llm-cache-dir`, and `--prompt-dir` CLI options
- [x] CLI now generates `llm_decisions.json`
- [x] CLI now logs LLM request/response events to `llm_calls.jsonl`
- [x] Markdown report now includes LLM decision summary
- [x] HTML report now includes LLM decision summary
- [x] README now documents LLM usage and safeguards

### Phase 9 - WordPress REST API Read-Only

- [x] Added read-only WordPress fetcher: `scripts/content-audit/lib/fetch-wordpress.mjs`
- [x] CLI now supports `--source wp`
- [x] CLI now collects public WordPress posts and pages without write actions
- [x] Inventory JSON now includes WordPress metadata when available
- [x] Inventory CSV now includes WordPress metadata columns
- [x] Markdown report now includes source summary
- [x] HTML report now includes source summary
- [x] README now documents WordPress REST read-only usage

### Phase 10 - Content Hash And Link Extraction Improvements

- [x] Added deterministic SHA-256 content hash helper: `scripts/content-audit/lib/content-hash.mjs`
- [x] HTML extraction now builds content hashes from normalized title, meta, headings, body text, links, and image data
- [x] HTML extraction now extracts sorted unique internal links and external links
- [x] HTML extraction now records per-image `src`, `alt`, and `missing_alt` data
- [x] WordPress REST extraction now uses the same stronger hash helper
- [x] WordPress REST extraction now extracts links from rendered content
- [x] WordPress REST extraction now improves image/alt extraction and includes embedded featured media when available
- [x] Inventory CSV now includes link counts and `content_hash`
- [x] README now documents Phase 10 outputs and deterministic link/hash behavior

### Phase 11 - First Release Hardening

- [x] Added `.gitignore` for dependencies, env files, local audit outputs, cache, logs, and build artifacts
- [x] Added content hash tests: `tests/content-hash.test.mjs`
- [x] Added HTML extraction tests: `tests/extract-page.test.mjs`
- [x] Added VPS/Linux setup guide: `docs/VPS_LINUX_SETUP.md`
- [x] README now documents install/test, VPS guide, and first release readiness

### Phase 12 - Link-Aware Scoring And Report Improvements

- [x] Internal link scoring now uses actual extracted internal link counts
- [x] Link scoring now considers content length and expected internal link density
- [x] Link scoring now flags pages with external links but no internal links
- [x] Link scoring now flags high external-to-internal link ratios and high external link counts
- [x] Default thresholds now include internal/external link scoring settings
- [x] Markdown report now includes link and image extraction summary
- [x] HTML report now includes link and image extraction summary
- [x] Added link-aware scoring tests: `tests/score-rules.test.mjs`

### Phase 13 - Release Validation And Tagging Prep

- [x] Added GitHub Actions CI workflow for Node.js 20 and 22
- [x] Added release checklist: `docs/RELEASE_CHECKLIST.md`
- [x] Added changelog: `CHANGELOG.md`
- [x] README now links release validation docs and CI/readiness notes

### Phase 14 - VPS Validation Fixes

- [x] Fixed Markdown report syntax crash triggered by `npm run audit:help`
- [x] Aligned link normalization test expectation with current extraction behavior
- [x] Bumped `fast-xml-parser` dependency to address reported moderate audit finding

## Current MVP Status

The project can now run a CLI-first content audit with sitemap, URL list, or public WordPress REST input. It generates inventory, scoring, clusters, cache/delta comparison, LLM candidate selection, optional advisory-only LLM decisions, JSON/CSV/Markdown/HTML reports, deterministic content hashes, internal/external link extraction, image alt extraction, and link-aware scoring/report summaries.

Core validation command:

```bash
npm install
npm test
npm run audit:help
npm audit
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/example-test
```

WordPress REST read-only source:

```bash
npm run audit -- \
  --url https://example.com \
  --source wp \
  --limit 50 \
  --out audits/content/wp-test
```

Optional LLM review:

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

Expected outputs:

```txt
audits/content/example-test/inventory.json
audits/content/example-test/rule_findings.json
audits/content/example-test/clusters.json
audits/content/example-test/llm_candidates.json
audits/content/example-test/llm_decisions.json
audits/content/example-test/llm_calls.jsonl
audits/content/example-test/cache_summary.json
audits/content/example-test/inventory.csv
audits/content/example-test/content_action_plan.csv
audits/content/example-test/content_audit_report.md
audits/content/example-test/content_audit_report.html
```

## Current Inventory Output

`inventory.json` includes:

- `url`
- `status`
- `ok`
- `canonical`
- `title`
- `meta_description`
- `h1`, `h2`, `h3`
- `word_count`
- `internal_links`
- `external_links`
- `images_total`
- `images_missing_alt`
- `images[]` with `src`, `alt`, and `missing_alt`
- `published_at`
- `modified_at`
- `category`
- `tags`
- `content_hash`

When running with `--source wp`, `inventory.json` and `inventory.csv` also include:

- `source_type`
- `wp_type`
- `wp_id`
- `wp_slug`
- `wp_status`

WordPress mode uses public GET requests only and does not authenticate or write to WordPress.

## Current Link-Aware Scoring

Link-aware scoring uses deterministic extracted data only. It currently checks:

- pages with no detected internal links
- pages with fewer internal links than the configured minimum
- longer pages with low internal link density
- pages with external links but no internal links
- pages with many external links
- pages with high external-to-internal link ratio

This does not crawl discovered links or verify whether those linked pages are alive yet.

## Release Validation

Before tagging `v0.1.0`, validate from a clean checkout or VPS:

```bash
npm install
npm test
npm run audit:help
npm audit
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/release-smoke-test
```

See `docs/RELEASE_CHECKLIST.md` for the full validation flow.

## Current Cache Output

`cache_summary.json` includes:

- `had_previous_cache`
- `new_urls`
- `changed_urls`
- `unchanged_urls`
- `removed_urls`
- `new_issues`
- `fixed_issues`
- `persistent_issues`
- sample URL lists for review

Cache comparison uses deterministic `content_hash` for improved change detection.

## Current LLM Candidate Output

`llm_candidates.json` includes:

- `summary.total`
- `summary.high_priority`
- `summary.medium_priority`
- `summary.page_candidates`
- `summary.cluster_candidates`
- `candidates[]` with type, priority, reason, prompt contract, review goal, flags/URLs, and cache key

This phase only selects what should be reviewed by AI. It does not call an LLM and does not mutate website content unless `--use-llm` is explicitly enabled.

## Current LLM Decision Output

`llm_decisions.json` includes:

- whether LLM review was enabled
- total/selected/skipped candidate counts
- cache/log paths
- decision summary
- advisory-only decisions
- failed decisions when the LLM call or JSON parsing fails

Decision recommendations are normalized to:

```txt
keep
update
merge_review
noindex_review
redirect_review
manual_review
```

Every decision remains advisory-only and requires human review before implementation.

## First Release Notes

Target release tag after validation:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Known Limitations

- Cluster logic is still lightweight and deterministic
- LLM policy is deterministic and conservative; it may need tuning after real audits
- LLM client currently supports chat-completions style JSON responses
- WordPress REST source currently uses public unauthenticated reads only
- Link extraction records links present in audited content but does not crawl or validate discovered links
- Web UI is intentionally deferred until CLI/VPS usage is stable

## Next Phase

Phase 15 - Real-Site Audit Feedback And Calibration

Potential files/actions:

- run real audits on 1-3 websites
- review generated `content_action_plan.csv` and HTML reports
- tune scoring thresholds and Vietnamese notes based on real outputs
- improve report language before adding more automation

Planned safeguards:

- no WordPress write actions
- no redirect/noindex/delete actions
- only tune deterministic scoring/reporting based on observed audit quality
