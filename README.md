# Content Audit Pro

CLI-first content audit tool for SEO and content cleanup workflows.

Current version: `0.1.0`.

The first MVP focuses on collecting URLs, fetching pages, extracting basic content/SEO fields, and generating `inventory.json`.

## Safety Scope

Version 1 is audit-only.

The tool does not:

- Edit WordPress content
- Create redirects
- Push noindex rules
- Delete posts/pages
- Perform destructive actions automatically

## Install

```bash
npm install
```

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

## Current Output

```txt
inventory.json
```

Each page currently includes:

- URL
- HTTP status
- canonical
- title
- meta description
- H1/H2/H3
- word count
- image count
- missing alt count
- content hash placeholder
- fetch timestamp
- error field

## Roadmap

See:

- `PLAN.md`
- `docs/CONTENT_AUDIT_CORE_LOGIC.md`
- `docs/CONTENT_AUDIT_BUILD_CHECKLIST.md`
- `PROGRESS.md`
