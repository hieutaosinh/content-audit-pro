#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from './lib/cli-args.mjs';
import { fetchSitemapUrls } from './lib/fetch-sitemap.mjs';
import { fetchUrlList } from './lib/fetch-url-list.mjs';
import { extractPageFromHtml } from './lib/extract-page.mjs';
import { scorePages } from './lib/score-rules.mjs';
import { writeJsonReport } from './lib/report-json.mjs';
import {
  actionPlanColumns,
  buildActionPlanRows,
  buildInventoryRows,
  inventoryColumns,
  writeCsvReport
} from './lib/report-csv.mjs';
import { writeMarkdownReport } from './lib/report-md.mjs';
import { writeHtmlReport } from './lib/report-html.mjs';

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

  const ruleFindings = scorePages(inventory);
  const generatedAt = new Date().toISOString();
  const summary = summarizeFindings(ruleFindings);

  const inventoryOutput = {
    tool: 'content-audit-pro',
    version: '0.1.0',
    primary_language: 'vi',
    generated_at: generatedAt,
    source: options.source,
    input_url: options.url,
    total_urls: urls.length,
    inventory
  };

  const findingsOutput = {
    tool: 'content-audit-pro',
    version: '0.1.0',
    primary_language: 'vi',
    generated_at: generatedAt,
    source: options.source,
    input_url: options.url,
    total_urls: urls.length,
    summary,
    findings: ruleFindings
  };

  const reportContext = {
    generatedAt,
    inputUrl: options.url,
    source: options.source,
    summary,
    inventory,
    findings: ruleFindings
  };

  const paths = {
    inventoryJson: path.join(options.outDir, 'inventory.json'),
    findingsJson: path.join(options.outDir, 'rule_findings.json'),
    inventoryCsv: path.join(options.outDir, 'inventory.csv'),
    actionPlanCsv: path.join(options.outDir, 'content_action_plan.csv'),
    markdown: path.join(options.outDir, 'content_audit_report.md'),
    html: path.join(options.outDir, 'content_audit_report.html')
  };

  await writeJsonReport(paths.inventoryJson, inventoryOutput);
  await writeJsonReport(paths.findingsJson, findingsOutput);
  await writeCsvReport(paths.inventoryCsv, buildInventoryRows(inventory), inventoryColumns);
  await writeCsvReport(paths.actionPlanCsv, buildActionPlanRows(ruleFindings), actionPlanColumns);
  await writeMarkdownReport(paths.markdown, reportContext);
  await writeHtmlReport(paths.html, reportContext);

  printSummary(summary);
  console.log('Hoàn tất kiểm tra website.');
  console.log(`Đã xuất inventory JSON tại: ${paths.inventoryJson}`);
  console.log(`Đã xuất kết quả chấm điểm tại: ${paths.findingsJson}`);
  console.log(`Đã xuất inventory CSV tại: ${paths.inventoryCsv}`);
  console.log(`Đã xuất action plan CSV tại: ${paths.actionPlanCsv}`);
  console.log(`Đã xuất báo cáo Markdown tại: ${paths.markdown}`);
  console.log(`Đã xuất báo cáo HTML tại: ${paths.html}`);
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

function summarizeFindings(findings) {
  const summary = {
    total: findings.length,
    average_score: 0,
    healthy: 0,
    needs_review: 0,
    weak: 0,
    high_risk: 0
  };

  if (!findings.length) return summary;

  const totalScore = findings.reduce((sum, item) => sum + item.server_score, 0);
  summary.average_score = Math.round(totalScore / findings.length);

  for (const item of findings) {
    if (summary[item.severity] !== undefined) summary[item.severity] += 1;
  }

  return summary;
}

function printSummary(summary) {
  console.log('Tóm tắt chấm điểm nội dung:');
  console.log(`- Tổng URL: ${summary.total}`);
  console.log(`- Điểm trung bình: ${summary.average_score}/100`);
  console.log(`- Tốt: ${summary.healthy}`);
  console.log(`- Cần rà soát: ${summary.needs_review}`);
  console.log(`- Yếu: ${summary.weak}`);
  console.log(`- Rủi ro cao: ${summary.high_risk}`);
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
