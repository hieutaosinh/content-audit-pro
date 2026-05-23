# VPS Linux Setup

This guide explains how to run Content Audit Pro as a CLI tool on a Linux VPS.

The tool is audit-only. It does not edit WordPress, create redirects, push noindex rules, or delete content.

## Requirements

- Ubuntu/Debian VPS or another Linux server
- Node.js 20 or newer
- Git
- Enough disk space for audit outputs and cache

Check versions:

```bash
node --version
npm --version
git --version
```

## Install Node.js 20 on Ubuntu/Debian

One common option is NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node --version
```

## Clone And Install

```bash
git clone https://github.com/hieutaosinh/content-audit-pro.git
cd content-audit-pro
npm install
npm test
```

## Run A Small Sitemap Audit

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --out audits/content/example-test
```

## Run A WordPress REST Read-Only Audit

Use this when the site exposes public WordPress REST API endpoints:

```bash
npm run audit -- \
  --url https://example.com \
  --source wp \
  --limit 50 \
  --out audits/content/wp-test
```

WordPress mode only performs public GET requests. It does not authenticate or write to the site.

## Optional LLM Review

By default, the tool only produces deterministic audit outputs and `llm_candidates.json`. It does not call an LLM unless `--use-llm` is set.

```bash
export OPENAI_API_KEY="your-key"

npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 20 \
  --use-llm \
  --llm-model gpt-4.1-mini \
  --llm-max-candidates 5 \
  --out audits/content/example-llm-test
```

## Output Files

Each audit output folder may include:

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

Open the HTML report directly or copy it to a downloadable location:

```bash
ls -lah audits/content/example-test
```

## Cache

Cache is enabled by default and stored under:

```txt
.cache/content-audit/<site>/last-audit.json
```

Disable cache for one run:

```bash
npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --no-cache \
  --out audits/content/no-cache-test
```

## Suggested VPS Folder Layout

```txt
/opt/content-audit-pro
  repo files
  audits/content/<site-or-client>/<date>
  .cache/content-audit
```

## Run With nohup For Longer Audits

```bash
nohup npm run audit -- \
  --url https://example.com/sitemap.xml \
  --source sitemap \
  --limit 500 \
  --out audits/content/example-large \
  > audit.log 2>&1 &

tail -f audit.log
```

## Troubleshooting

### Node version is too old

Install Node.js 20 or newer, then run:

```bash
node --version
npm install
npm test
```

### WordPress REST returns an error

Check whether these endpoints are public:

```bash
curl -I https://example.com/wp-json/wp/v2/posts
curl -I https://example.com/wp-json/wp/v2/pages
```

Some sites disable public REST access or block unknown user agents.

### Output folder is too large

Audit outputs and cache are ignored by Git. Remove old local outputs when they are no longer needed:

```bash
rm -rf audits/content/old-run
rm -rf .cache/content-audit/old-site
```
