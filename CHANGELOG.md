# Changelog

All notable changes to Content Audit Pro will be documented in this file.

## v0.1.0 - First CLI MVP

Initial CLI-first, audit-only release candidate.

### Added

- CLI audit runner for sitemap, URL list, and public WordPress REST sources.
- URL normalization and sitemap/URL-list collection.
- HTML page extraction for title, meta description, canonical, headings, word count, dates, tags, internal links, external links, images, and content hash.
- Public read-only WordPress REST extraction for posts and pages.
- Deterministic SHA-256 content hash helper.
- Rule-based scoring with Vietnamese notes and severity labels.
- Duplicate/overlap cluster detection.
- Cache and re-audit delta comparison.
- LLM-needed candidate selection.
- Optional advisory-only LLM review with prompt contracts, cache, and call logging.
- JSON, CSV, Markdown, and HTML reports.
- Link-aware scoring and link/image report summaries.
- VPS/Linux setup guide.
- Release checklist.
- CI workflow for Node.js 20 and 22.
- Focused tests for content hashing, HTML extraction, and link-aware scoring.

### Safety

- No WordPress write actions.
- No automatic redirects.
- No automatic noindex changes.
- No automatic content deletion.
- LLM calls are disabled by default and only run with `--use-llm`.
- LLM decisions are advisory-only and require human review.

### Known Limitations

- Cluster logic is still lightweight and deterministic.
- LLM policy may need tuning after real audits.
- WordPress REST source uses public unauthenticated reads only.
- Link extraction records links present in audited content but does not crawl or validate discovered links.
- Web UI is intentionally deferred until CLI/VPS usage is stable.
