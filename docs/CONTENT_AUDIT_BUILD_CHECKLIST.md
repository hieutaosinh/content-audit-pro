# Content Audit Build Checklist

Purpose: implementation checklist for adding a content-audit layer next to `audit-pro-git`.

Read `docs/CONTENT_AUDIT_CORE_LOGIC.md` first. This checklist controls scope. Do not add WordPress write actions in V1.

## MVP Scope

- [ ] Accept input from sitemap URL, WordPress REST API, or a URL list.
- [ ] Crawl/fetch posts and pages.
- [ ] Extract normalized inventory fields.
- [ ] Score each URL with the rule-based rubric.
- [ ] Generate duplicate and near-duplicate candidates.
- [ ] Build basic topic clusters.
- [ ] Decide which pages/clusters need LLM review.
- [ ] Cache LLM results by fingerprint.
- [ ] Generate report files.
- [ ] Keep all actions as recommendations only.

## Recommended Folder Structure

```txt
scripts/
  content-audit/
    content-audit.mjs
    lib/
      fetch-sitemap.mjs
      fetch-wordpress.mjs
      extract-page.mjs
      score-rules.mjs
      cluster-pages.mjs
      llm-policy.mjs
      llm-client.mjs
      cache.mjs
      report-json.mjs
      report-csv.mjs
      report-md.mjs
      report-html.mjs
    prompts/
      content-cluster-review.v1.md
      page-quality-review.v1.md
    config/
      default-thresholds.json
```

## CLI Target

Suggested command:

```bash
node scripts/content-audit/content-audit.mjs \
  --url https://example.com \
  --source sitemap \
  --limit 100 \
  --out audits/content/2026-05-19/example-com
```

Optional later flags:

```bash
--wp-api https://example.com/wp-json/wp/v2
--urls ./urls.txt
--use-llm
--llm-model gpt-4.1-mini
--cache ./.cache/content-audit
--format json,md,html,csv
```

## Phase 1: Input And Fetching

- [ ] Add sitemap parser.
- [ ] Add URL normalization.
- [ ] Add robots-aware crawl delay config.
- [ ] Add status-code collection.
- [ ] Add canonical extraction.
- [ ] Add title/meta/H1-H3 extraction.
- [ ] Add main-content extraction.
- [ ] Add internal/external link extraction.
- [ ] Add image alt extraction.
- [ ] Add publish/modified date extraction from HTML and JSON-LD when possible.
- [ ] Add WordPress REST API support later if sitemap/HTML is not enough.

Inventory fields:

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

## Phase 2: Rule-Based Score

- [ ] Implement scoring from `CONTENT_AUDIT_CORE_LOGIC.md`.
- [ ] Keep thresholds in `default-thresholds.json`.
- [ ] Return both numeric score and flags.
- [ ] Make scoring deterministic.
- [ ] Add simple test samples for thin content, missing metadata, duplicate title, and stale page.

Suggested scoring output:

```json
{
  "url": "https://example.com/post/",
  "server_score": 72,
  "server_flags": ["stale_content", "low_internal_links"],
  "severity": "needs_review"
}
```

## Phase 3: Duplicate And Cluster Detection

- [ ] Exact duplicate title detection.
- [ ] Exact duplicate meta description detection.
- [ ] Similar slug detection.
- [ ] Similar heading-set detection.
- [ ] Lightweight keyword/entity overlap.
- [ ] Group pages into clusters.
- [ ] Assign cluster risk level.

Cluster fields:

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

## Phase 4: LLM Needed Policy

- [ ] Implement `llm_needed` logic.
- [ ] Do not send every page to LLM by default.
- [ ] Send only changed, risky, ambiguous, or high-value pages/clusters.
- [ ] Reuse cached results when fingerprint is unchanged.
- [ ] Store prompt version and rubric version.

Decision fields:

```json
{
  "url": "",
  "cluster_id": "",
  "llm_needed": true,
  "llm_reason": "Cluster has similar intent and needs merge decision."
}
```

## Phase 5: LLM Prompt Contracts

LLM must return JSON only.

Cluster review target schema:

```json
{
  "cluster_id": "",
  "cluster_intent": "",
  "pillar_url": "",
  "decisions": [
    {
      "url": "",
      "action": "KEEP|UPDATE|MERGE|REDIRECT|NOINDEX|DELETE_DRAFT",
      "target_url": null,
      "confidence": "low|medium|high",
      "reason": "",
      "recommended_notes": "",
      "requires_human_approval": true
    }
  ]
}
```

Page quality review target schema:

```json
{
  "url": "",
  "search_intent": "",
  "quality_risks": [],
  "missing_sections": [],
  "eeat_gaps": [],
  "recommended_action": "KEEP|UPDATE|MERGE|REDIRECT|NOINDEX|DELETE_DRAFT",
  "confidence": "low|medium|high",
  "rewrite_outline": []
}
```

## Phase 6: Cache

- [ ] Create cache folder.
- [ ] Use content hash and cluster hash.
- [ ] Save LLM input and output.
- [ ] Save model name, prompt version, rubric version.
- [ ] Reuse only when all fingerprint conditions match.
- [ ] Add cache-bypass flag later.

Cache object:

```json
{
  "cache_key": "",
  "url": "",
  "content_hash": "",
  "cluster_hash": "",
  "prompt_version": "content-cluster-review.v1",
  "rubric_version": "content-audit-rubric.v1",
  "llm_model": "",
  "input": {},
  "output": {},
  "created_at": ""
}
```

## Phase 7: Reports

Generate:

- [ ] `inventory.csv`
- [ ] `inventory.json`
- [ ] `rule_findings.json`
- [ ] `clusters.json`
- [ ] `llm_decisions.json`
- [ ] `content_action_plan.csv`
- [ ] `content_audit_report.md`
- [ ] `content_audit_report.html`

Report sections:

- [ ] Executive summary.
- [ ] URL inventory.
- [ ] Score distribution.
- [ ] High-risk pages.
- [ ] Duplicate/overlap clusters.
- [ ] Pages needing update.
- [ ] Merge/redirect candidates.
- [ ] Noindex candidates.
- [ ] Recommended next actions.
- [ ] Safety note: all destructive actions require human approval.

## Phase 8: Safety Guardrails

- [ ] No WordPress write actions.
- [ ] No redirects created automatically.
- [ ] No noindex pushed automatically.
- [ ] No deletion automatically.
- [ ] Every destructive recommendation has `requires_human_approval = true`.
- [ ] Report clearly marks LLM judgment vs server fact.
- [ ] Log every LLM call.

## Phase 9: Later Extensions

Only after MVP is stable:

- [ ] WordPress read-only connector.
- [ ] Google Search Console import.
- [ ] GA4 import.
- [ ] Keyword mapping.
- [ ] Content brief generator.
- [ ] Merge draft generator.
- [ ] Human approval queue.
- [ ] WordPress write-back with explicit approval.
- [ ] Redirect export file for RankMath/Yoast/Nginx/Apache.

## Done Definition

MVP is done when:

- [ ] A user can run one CLI command.
- [ ] The tool audits at least 50 URLs.
- [ ] It generates CSV, JSON, Markdown, and HTML reports.
- [ ] It separates server facts from LLM judgments.
- [ ] It only calls LLM for selected pages/clusters.
- [ ] Re-running the same audit reuses cache.
- [ ] The action plan is useful enough for manual SEO/content cleanup.
