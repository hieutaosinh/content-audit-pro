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

## Current MVP Status

The project can now run a CLI-first content audit with sitemap, URL list, or public WordPress REST input. It generates inventory, scoring, clusters, cache/delta comparison, LLM candidate selection, optional advisory-only LLM decisions, JSON/CSV/Markdown/HTML reports, deterministic content hashes, internal/external link extraction, and image alt extraction.

Core command:

```bash
npm install
npm test
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

Target release tag after Phase 11 is merged and validated:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Recommended validation before tagging:

```bash
npm install
npm test
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/release-smoke-test
```

## Known Limitations

- Cluster logic is still lightweight and deterministic
- LLM policy is deterministic and conservative; it may need tuning after real audits
- LLM client currently supports chat-completions style JSON responses
- WordPress REST source currently uses public unauthenticated reads only
- Link extraction does not crawl discovered links; it only records links present in audited page content
- Web UI is intentionally deferred until CLI/VPS usage is stable

## Next Phase

Phase 12 - Link-Aware Scoring And Report Improvements

Potential files:

- update `scripts/content-audit/lib/score-rules.mjs`
- update `scripts/content-audit/lib/report-md.mjs`
- update `scripts/content-audit/lib/report-html.mjs`

Potential outputs/improvements:

- use internal/external link counts in scoring more explicitly
- expose link/image extraction summaries in Markdown and HTML reports
- add clearer Vietnamese guidance for internal linking and image alt cleanup

Planned safeguards:

- no WordPress write actions
- no redirect/noindex/delete actions
- keep outputs deterministic before adding more automation
