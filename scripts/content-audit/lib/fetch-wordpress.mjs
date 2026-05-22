import * as cheerio from 'cheerio';
import { normalizeUrl } from './normalize-url.mjs';
import { buildContentHash } from './content-hash.mjs';

const DEFAULT_TYPES = ['posts', 'pages'];

export async function fetchWordPressContent(baseUrl, options = {}) {
  const limit = options.limit || 50;
  const perPage = Math.min(100, Math.max(1, limit));
  const types = options.types || DEFAULT_TYPES;
  const records = [];

  for (const type of types) {
    if (records.length >= limit) break;
    const remaining = limit - records.length;
    const items = await fetchWordPressType(baseUrl, type, { ...options, limit: remaining, perPage });
    records.push(...items);
  }

  return records.slice(0, limit);
}

export async function fetchWordPressUrls(baseUrl, options = {}) {
  const records = await fetchWordPressContent(baseUrl, options);
  return records.map((item) => item.url).filter(Boolean);
}

async function fetchWordPressType(baseUrl, type, options) {
  const items = [];
  let page = 1;

  while (items.length < options.limit) {
    const endpoint = buildEndpoint(baseUrl, type, {
      per_page: Math.min(options.perPage, options.limit - items.length),
      page,
      _embed: 1,
      status: 'publish'
    });

    const response = await fetch(endpoint, {
      headers: {
        accept: 'application/json',
        'user-agent': options.userAgent || 'ContentAuditPro/0.1'
      }
    });

    if (response.status === 400 && page > 1) break;
    if (!response.ok) {
      throw new Error(`WordPress REST ${type} request failed with ${response.status}: ${endpoint}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) break;

    items.push(...data.map((item) => normalizeWordPressItem(item, type, response.status)).filter(Boolean));

    const totalPages = Number(response.headers.get('x-wp-totalpages') || 0);
    if (totalPages && page >= totalPages) break;
    if (data.length < Math.min(options.perPage, options.limit)) break;
    page += 1;
  }

  return items;
}

function buildEndpoint(baseUrl, type, params) {
  const root = normalizeWordPressBase(baseUrl);
  const endpoint = new URL(`/wp-json/wp/v2/${type}`, root);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) endpoint.searchParams.set(key, String(value));
  }
  return endpoint.toString();
}

function normalizeWordPressBase(input) {
  const url = new URL(input);
  if (url.pathname.includes('/wp-json/')) {
    url.pathname = url.pathname.split('/wp-json/')[0] || '/';
    url.search = '';
    url.hash = '';
  }
  return url.toString();
}

function normalizeWordPressItem(item, type, statusCode) {
  const url = normalizeUrl(item.link || item.guid?.rendered || '');
  if (!url) return null;

  const title = cleanText(rendered(item.title));
  const excerpt = cleanText(stripHtml(rendered(item.excerpt)));
  const contentHtml = rendered(item.content);
  const $ = cheerio.load(contentHtml || '');
  $('script, style, noscript, template').remove();

  const h1 = title ? [title] : [];
  const h2 = extractHeadings($, 'h2');
  const h3 = extractHeadings($, 'h3');
  const text = cleanText($.root().text());
  const links = extractLinks($, url);
  const images = extractImages($, url, item);
  const category = firstEmbeddedName(item, 'wp:term', 'category') || firstId(item.categories);
  const tags = uniqueStrings(embeddedNames(item, 'wp:term', 'post_tag').concat(idList(item.tags)));
  const modifiedAt = item.modified_gmt || item.modified || null;

  return {
    url,
    status: statusCode,
    ok: true,
    source_type: 'wordpress_rest',
    wp_type: type,
    wp_id: item.id,
    wp_slug: item.slug || null,
    wp_status: item.status || null,
    canonical: url,
    title,
    meta_description: excerpt,
    h1,
    h2,
    h3,
    word_count: countWords(text),
    internal_links: links.internal,
    external_links: links.external,
    images_total: images.total,
    images_missing_alt: images.missing_alt,
    images: images.items,
    published_at: item.date_gmt || item.date || null,
    modified_at: modifiedAt,
    category,
    tags,
    content_hash: buildContentHash({ wp_id: item.id, wp_type: type, modified_at: modifiedAt, title, meta_description: excerpt, h1, h2, h3, body_text: text, internal_links: links.internal, external_links: links.external, images: images.items, category, tags }),
    fetched_at: new Date().toISOString(),
    error: null
  };
}

function rendered(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.rendered || '';
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function extractHeadings($, tag) {
  return $(tag).map((_, element) => cleanText($(element).text())).get().filter(Boolean);
}

function extractLinks($, baseUrl) {
  const baseHost = hostname(baseUrl);
  const internal = new Set();
  const external = new Set();

  $('a[href]').each((_, element) => {
    const normalized = normalizeLink($(element).attr('href'), baseUrl);
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

function extractImages($, baseUrl, item) {
  const featuredImage = featuredImageFromEmbedded(item);
  const images = [];

  $('img').each((_, element) => {
    const image = $(element);
    images.push({
      src: normalizeLink(image.attr('src') || image.attr('data-src') || image.attr('data-lazy-src'), baseUrl) || '',
      alt: cleanText(image.attr('alt')),
      missing_alt: !cleanText(image.attr('alt'))
    });
  });

  if (featuredImage?.src && !images.some((image) => image.src === featuredImage.src)) images.push(featuredImage);

  const uniqueImages = uniqueImageList(images);
  return {
    total: uniqueImages.length,
    missing_alt: uniqueImages.filter((image) => image.missing_alt).length,
    items: uniqueImages
  };
}

function featuredImageFromEmbedded(item) {
  const media = item?._embedded?.['wp:featuredmedia'];
  const first = Array.isArray(media) ? media[0] : null;
  const src = first?.source_url || first?.media_details?.sizes?.full?.source_url || '';
  if (!src) return null;
  const alt = cleanText(first.alt_text || first.title?.rendered || '');
  return { src, alt, missing_alt: !alt };
}

function normalizeLink(value, baseUrl) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('#')) return null;
  if (/^(mailto|tel|javascript|data):/i.test(raw)) return null;

  try {
    const parsed = new URL(raw, baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
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

function embeddedNames(item, rel, taxonomy) {
  const groups = item?._embedded?.[rel];
  if (!Array.isArray(groups)) return [];
  return groups
    .flat()
    .filter((term) => !taxonomy || term.taxonomy === taxonomy)
    .map((term) => term.name)
    .filter(Boolean);
}

function firstEmbeddedName(item, rel, taxonomy) {
  return embeddedNames(item, rel, taxonomy)[0] || null;
}

function firstId(value) {
  return Array.isArray(value) && value.length ? String(value[0]) : null;
}

function idList(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => cleanText(value)).filter(Boolean))];
}

function uniqueImageList(images) {
  const seen = new Set();
  const output = [];

  for (const image of images) {
    const key = `${image.src}|${image.alt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(image);
  }

  return output.sort((a, b) => `${a.src}|${a.alt}`.localeCompare(`${b.src}|${b.alt}`));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countWords(value) {
  const text = cleanText(value);
  return text ? text.split(/\s+/).length : 0;
}
