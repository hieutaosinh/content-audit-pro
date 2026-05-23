# Release Checklist

Use this checklist before tagging the first CLI release.

Target release: `v0.1.0`

## 1. Local Or VPS Validation

Run from a clean checkout:

```bash
git checkout main
git pull origin main
npm install
npm test
npm run audit:help
```

## 2. Smoke Audit With Sitemap

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/release-smoke-sitemap
```

Confirm these files exist:

```txt
audits/content/release-smoke-sitemap/inventory.json
audits/content/release-smoke-sitemap/rule_findings.json
audits/content/release-smoke-sitemap/clusters.json
audits/content/release-smoke-sitemap/llm_candidates.json
audits/content/release-smoke-sitemap/llm_decisions.json
audits/content/release-smoke-sitemap/cache_summary.json
audits/content/release-smoke-sitemap/inventory.csv
audits/content/release-smoke-sitemap/content_action_plan.csv
audits/content/release-smoke-sitemap/content_audit_report.md
audits/content/release-smoke-sitemap/content_audit_report.html
```

## 3. Smoke Audit With WordPress REST

Use a public WordPress site that exposes REST API:

```bash
npm run audit -- \
  --url https://example.com \
  --source wp \
  --limit 20 \
  --out audits/content/release-smoke-wp
```

Confirm WordPress metadata appears in `inventory.json` and `inventory.csv`:

- `source_type`
- `wp_type`
- `wp_id`
- `wp_slug`
- `wp_status`
- `published_at`
- `modified_at`
- `category`
- `tags`

## 4. Optional LLM Smoke Test

Only run this if an API key is available.

```bash
export OPENAI_API_KEY="your-key"

npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --use-llm \
  --llm-max-candidates 2 \
  --out audits/content/release-smoke-llm
```

Confirm:

- `llm_candidates.json` exists
- `llm_decisions.json` exists
- `llm_calls.jsonl` exists when LLM calls are made
- LLM decisions are advisory-only

## 5. Report Review

Open:

```txt
content_audit_report.html
content_audit_report.md
inventory.csv
content_action_plan.csv
```

Check that the report includes:

- Vietnamese summary
- score distribution
- cache/delta section
- LLM candidate summary
- link/image summary
- safety note

## 6. Safety Review

Confirm the release still follows V1 safety scope:

- no WordPress write actions
- no automatic redirect creation
- no automatic noindex push
- no automatic delete
- LLM calls are disabled unless `--use-llm` is passed
- LLM decisions are advisory-only

## 7. Tag Release

After validation passes on `main`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 8. After Release

Suggested next planning area:

```txt
Phase 14 - Real-Site Audit Feedback And Calibration
```

Use real audit outputs to tune thresholds, scoring notes, and report language before adding more automation.
