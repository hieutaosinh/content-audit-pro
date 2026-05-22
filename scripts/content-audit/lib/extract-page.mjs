import * as cheerio from 'cheerio';

export function extractPageFromHtml(url, html, status = 200) {
  const $ = cheerio.load(html || '');
  const bodyText = cleanText($('body').text());

  return {
    url,
    status,
    ok: status >= 200 && status < 400,
    canonical: $('link[rel="canonical"]').attr('href') || null,
    title: cleanText($('title').first().text()),
    meta_description: cleanText($('meta[name="description"]').attr('content')),
    h1: extractTexts($, 'h1'),
    h2: extractTexts($, 'h2'),
    h3: extractTexts($, 'h3'),
    word_count: countWords(bodyText),
    internal_links: [],
    external_links: [],
    images_total: $('img').length,
    images_missing_alt: $('img:not([alt]), img[alt=""]').length,
    published_at: null,
    modified_at: null,
    category: null,
    tags: [],
    content_hash: String(bodyText.length),
    fetched_at: new Date().toISOString(),
    error: null
  };
}

function extractTexts($, selector) {
  return $(selector).map((_, element) => cleanText($(element).text())).get().filter(Boolean);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countWords(value) {
  const text = cleanText(value);
  return text ? text.split(/\s+/).length : 0;
}
