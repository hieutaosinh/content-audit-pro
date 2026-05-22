import { normalizeUrl } from './normalize-url.mjs';

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
  const h1 = title ? [title] : [];
  const h2 = extractHeadings(contentHtml, 'h2');
  const h3 = extractHeadings(contentHtml, 'h3');
  const text = cleanText(stripHtml(contentHtml));

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
    internal_links: [],
    external_links: [],
    images_total: countMatches(contentHtml, /<img\b/gi),
    images_missing_alt: countMissingAltImages(contentHtml),
    published_at: item.date_gmt || item.date || null,
    modified_at: item.modified_gmt || item.modified || null,
    category: firstEmbeddedName(item, 'wp:term', 'category') || firstId(item.categories),
    tags: embeddedNames(item, 'wp:term', 'post_tag').concat(idList(item.tags)),
    content_hash: simpleHash(`${item.id}|${item.modified_gmt || item.modified || ''}|${text}`),
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

function extractHeadings(html, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const headings = [];
  for (const match of String(html || '').matchAll(pattern)) {
    const text = cleanText(stripHtml(match[1]));
    if (text) headings.push(text);
  }
  return headings;
}

function countMissingAltImages(html) {
  const images = String(html || '').match(/<img\b[^>]*>/gi) || [];
  return images.filter((img) => !/\salt\s*=\s*['"][^'"]+['"]/i.test(img)).length;
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

function countMatches(value, pattern) {
  return (String(value || '').match(pattern) || []).length;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countWords(value) {
  const text = cleanText(value);
  return text ? text.split(/\s+/).length : 0;
}

function simpleHash(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}
