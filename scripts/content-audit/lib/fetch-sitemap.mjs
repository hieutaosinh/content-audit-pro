import { XMLParser } from 'fast-xml-parser';
import { normalizeUrl, uniqueUrls } from './normalize-url.mjs';

export async function fetchSitemapUrls(sitemapUrl, options = {}) {
  const { limit = 50 } = options;
  const response = await fetch(sitemapUrl);

  if (!response.ok) {
    throw new Error(`Could not read sitemap. HTTP status: ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const urls = [];

  collectLocations(parsed, urls);

  return uniqueUrls(urls.map((item) => normalizeUrl(item))).slice(0, limit);
}

function collectLocations(value, output) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) collectLocations(item, output);
    return;
  }

  if (typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc' && typeof child === 'string') {
      output.push(child);
    } else {
      collectLocations(child, output);
    }
  }
}
