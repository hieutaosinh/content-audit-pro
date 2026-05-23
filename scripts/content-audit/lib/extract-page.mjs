import * as cheerio from 'cheerio';
import { buildContentHash } from './content-hash.mjs';

export function extractPageFromHtml(url, html, status = 200) {
  const $ = cheerio.load(html || '');
  $('script, style, noscript, template').remove();

  const bodyText = cleanText($('body').text());
  const title = cleanText($('title').first().text());
  const metaDescription = cleanText($('meta[name="description"]').attr('content'));
  const canonical = normalizeLink($('link[rel="canonical"]').attr('href'), url) || null;
  const h1 = extractTexts($, 'h1');
  const h2 = extractTexts($, 'h2');
  const h3 = extractTexts($, 'h3');
  const links = extractLinks($, url);
  const images = extractImages($, url);

  return {
    url,
    status,
    ok: status >= 200 && status < 400,
    canonical,
    title,
    meta_description: metaDescription,
    h1,
    h2,
    h3,
    word_count: countWords(bodyText),
    internal_links: links.internal,
    external_links: links.external,
    images_total: images.total,
    images_missing_alt: images.missing_alt,
    images: images.items,
    published_at: extractDate($, 'article:published_time') || extractDate($, 'datePublished'),
    modified_at: extractDate($, 'article:modified_time') || extractDate($, 'dateModified'),
    category: null,
    tags: extractMetaList($, 'article:tag'),
    content_hash: buildContentHash({ title, meta_description: metaDescription, h1, h2, h3, body_text: bodyText, internal_links: links.internal, external_links: links.external, images: images.items }),
    fetched_at: new Date().toISOString(),
    error: null
  };
}

function extractTexts($, selector) {
  return $(selector).map((_, element) => cleanText($(element).text())).get().filter(Boolean);
}

function extractLinks($, baseUrl) {
  const baseHost = hostname(baseUrl);
  const internal = new Set();
  const external = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const normalized = normalizeLink(href, baseUrl);
    if (!normalized) return;

    const targetHost = hostname(normalized);
    if (baseHost && targetHost === baseHost) internal.add(normalized);
    else external.add(normalized);
  });

  return {
    internal: [...internal].sort(),
    external: [...external].sort()
  };
}

function extractImages($, baseUrl) {
  const items = [];

  $('img').each((_, element) => {
    const image = $(element);
    const src = normalizeLink(image.attr('src') || image.attr('data-src') || image.attr('data-lazy-src'), baseUrl);
    const alt = cleanText(image.attr('alt'));

    items.push({
      src: src || '',
      alt,
      missing_alt: !alt
    });
  });

  return {
    total: items.length,
    missing_alt: items.filter((image) => image.missing_alt).length,
    items: items.sort((a, b) => `${a.src}|${a.alt}`.localeCompare(`${b.src}|${b.alt}`))
  };
}

function normalizeLink(value, baseUrl) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data):/i.test(raw)) return null;

  try {
    const parsed = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const base = new URL(baseUrl);
    if (hostname(parsed.toString()) === hostname(base.toString())) {
      parsed.hostname = base.hostname.replace(/^www\./i, '');
    }
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function extractDate($, key) {
  const selector = `meta[property="${key}"], meta[name="${key}"], time[datetime]`;
  const value = $(selector).first().attr('content') || $(selector).first().attr('datetime');
  return cleanText(value) || null;
}

function extractMetaList($, key) {
  return $(`meta[property="${key}"], meta[name="${key}"]`)
    .map((_, element) => cleanText($(element).attr('content')))
    .get()
    .filter(Boolean);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countWords(value) {
  const text = cleanText(value);
  return text ? text.split(/\s+/).length : 0;
}
