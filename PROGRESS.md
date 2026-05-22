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

## Current MVP Status

The project can now run a basic inventory, scoring, report, cluster, re-audit comparison, LLM-needed candidate selection, and optional advisory-only LLM review:

```bash
npm install
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/example-test
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

## Known Limitations

- Cache uses current placeholder `content_hash`; stronger hash should be added later
- Cluster logic is still lightweight and deterministic
- LLM policy is deterministic and conservative; it may need tuning after real audits
- LLM client currently supports chat-completions style JSON responses
- WordPress REST source is not implemented yet
- Internal/external link extraction is currently a placeholder
- `.gitignore` still needs to be added

## Next Phase

Phase 9 - WordPress REST API Read-Only

Planned files:

- `scripts/content-audit/lib/fetch-wordpress.mjs`
- update `scripts/content-audit/content-audit.mjs`
- update reports with WordPress source metadata

Planned outputs/improvements:

- collect posts/pages from WordPress REST
- get publish date, modified date, slug, status, category, tag, and content more reliably
- keep the source read-only

Planned safeguards:

- no WordPress write actions
- no redirect/noindex/delete actions
- authentication optional and read-only if added later
