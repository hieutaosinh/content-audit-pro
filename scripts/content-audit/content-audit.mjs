#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from './lib/cli-args.mjs';
import { fetchSitemapUrls } from './lib/fetch-sitemap.mjs';
import { fetchUrlList } from './lib/fetch-url-list.mjs';
import { extractPageFromHtml } from './lib/extract-page.mjs';

async function main() {
  const options = parseArgs();
  await mkdir(options.outDir, { recursive: true });

  console.log('Bắt đầu kiểm tra nội dung website...');
  console.log(`Nguồn dữ liệu: ${options.source}`);

  const urls = await collectUrls(options);
  const inventory = [];

  console.log(`Tìm thấy ${urls.length} URL cần kiểm tra.`);

  for (const url of urls) {
    console.log(`Đang kiểm tra: ${url}`);
    inventory.push(await fetchAndExtract(url));
  }

  const output = {
    tool: 'content-audit-pro',
    version: '0.1.0',
    primary_language: 'vi',
    generated_at: new Date().toISOString(),
    source: options.source,
    input_url: options.url,
    total_urls: urls.length,
    inventory
  };

  const outputPath = path.join(options.outDir, 'inventory.json');
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log('Hoàn tất kiểm tra website.');
  console.log(`Đã xuất báo cáo inventory tại: ${outputPath}`);
}

async function collectUrls(options) {
  if (options.source === 'sitemap') {
    return fetchSitemapUrls(options.url, { limit: options.limit });
  }

  if (options.source === 'urls') {
    if (!options.urlsPath) throw new Error('Thiếu --urls <path> khi dùng --source urls.');
    return fetchUrlList(options.urlsPath, { limit: options.limit });
  }

  throw new Error('Nguồn WordPress sẽ được triển khai ở giai đoạn sau. Hiện tại hãy dùng --source sitemap hoặc --source urls.');
}

async function fetchAndExtract(url) {
  const startedAt = Date.now();

  try {
    const response = await fetch(url);
    const html = await response.text();
    const page = extractPageFromHtml(url, html, response.status);
    return { ...page, fetch_ms: Date.now() - startedAt };
  } catch (error) {
    return failedPage(url, error, Date.now() - startedAt);
  }
}

function failedPage(url, error, fetchMs) {
  return {
    url,
    status: null,
    ok: false,
    canonical: null,
    title: '',
    meta_description: '',
    h1: [],
    h2: [],
    h3: [],
    word_count: 0,
    internal_links: [],
    external_links: [],
    images_total: 0,
    images_missing_alt: 0,
    published_at: null,
    modified_at: null,
    category: null,
    tags: [],
    content_hash: '',
    fetched_at: new Date().toISOString(),
    fetch_ms: fetchMs,
    error: error.message
  };
}

main().catch((error) => {
  console.error(`Lỗi khi kiểm tra website: ${error.message}`);
  process.exitCode = 1;
});
