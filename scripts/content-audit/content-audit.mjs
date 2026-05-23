#!/usr/bin/env node

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from './lib/cli-args.mjs';
import { fetchSitemapUrls } from './lib/fetch-sitemap.mjs';
import { fetchUrlList } from './lib/fetch-url-list.mjs';
import { fetchWordPressContent } from './lib/fetch-wordpress.mjs';
import { extractPageFromHtml } from './lib/extract-page.mjs';
import { scorePages } from './lib/score-rules.mjs';
import { clusterPages } from './lib/cluster-pages.mjs';
import { buildLlmCandidates } from './lib/llm-policy.mjs';
import { buildLlmDecisions } from './lib/llm-client.mjs';
import { buildAuditSnapshot, compareAuditSnapshots, getCachePaths, readPreviousAudit, writeCurrentAudit } from './lib/cache.mjs';
import { writeJsonReport } from './lib/report-json.mjs';
import { actionPlanColumns, buildActionPlanRows, buildInventoryRows, inventoryColumns, writeCsvReport } from './lib/report-csv.mjs';
import { writeMarkdownReport } from './lib/report-md.mjs';
import { writeHtmlReport } from './lib/report-html.mjs';

async function main() {
  const options = parseArgs();
  await mkdir(options.outDir, { recursive: true });

  console.log('Bắt đầu kiểm tra nội dung website...');
  const inventory = await collectInventory(options);
  const urls = inventory.map((page) => page.url);
  console.log(`Tìm thấy ${urls.length} URL cần kiểm tra.`);

  const findings = scorePages(inventory);
  const clusters = clusterPages(inventory, findings);
  const llmCandidates = buildLlmCandidates({ inventory, findings, clusters });
  const generatedAt = new Date().toISOString();
  const summary = summarizeFindings(findings);
  const clusterSummary = summarizeClusters(clusters);
  const sourceSummary = summarizeSource(inventory, options);
  const cacheSummary = await handleCache(options, { generatedAt, inventory, findings, clusters });
  const paths = buildOutputPaths(options.outDir, options.url);
  const llmDecisions = await buildLlmDecisions({ candidatesResult: llmCandidates, inventory, findings, clusters, options, generatedAt, paths });

  const reportContext = { generatedAt, inputUrl: options.url, source: options.source, sourceSummary, summary, clusterSummary, cacheSummary, llmCandidateSummary: llmCandidates.summary, llmDecisionSummary: llmDecisions.summary, inventory, findings, clusters };

  await writeJsonReport(paths.inventoryJson, { ...baseOutput(options, generatedAt, urls.length), source_summary: sourceSummary, inventory });
  await writeJsonReport(paths.findingsJson, { ...baseOutput(options, generatedAt, urls.length), summary, findings });
  await writeJsonReport(paths.clustersJson, { ...baseOutput(options, generatedAt, urls.length), summary: clusterSummary, clusters });
  await writeJsonReport(paths.llmCandidatesJson, { ...baseOutput(options, generatedAt, urls.length), summary: llmCandidates.summary, candidates: llmCandidates.candidates });
  await writeJsonReport(paths.llmDecisionsJson, { ...baseOutput(options, generatedAt, urls.length), ...llmDecisions });
  await writeJsonReport(paths.cacheSummaryJson, cacheSummary);
  await writeCsvReport(paths.inventoryCsv, buildInventoryRows(inventory, findings), inventoryColumns);
  await writeCsvReport(paths.actionPlanCsv, buildActionPlanRows(findings), actionPlanColumns);
  await writeMarkdownReport(paths.markdown, reportContext);
  await writeHtmlReport(paths.html, reportContext);

  printSummary(summary, clusterSummary, cacheSummary, llmCandidates.summary, llmDecisions, sourceSummary);
  printOutputPaths(paths);
}

async function collectInventory(options) {
  if (options.source === 'wp') {
    console.log('Đang lấy dữ liệu WordPress REST API ở chế độ read-only...');
    return fetchWordPressContent(options.url, { limit: options.limit, userAgent: options.userAgent });
  }

  const urls = await collectUrls(options);
  const inventory = [];
  for (const url of urls) {
    console.log(`Đang kiểm tra: ${url}`);
    inventory.push(await fetchAndExtract(url));
  }
  return inventory;
}

async function collectUrls(options) {
  if (options.source === 'sitemap') return fetchSitemapUrls(options.url, { limit: options.limit });
  if (options.source === 'urls') {
    if (!options.urlsPath) throw new Error('Thiếu --urls <path> khi dùng --source urls.');
    return fetchUrlList(options.urlsPath, { limit: options.limit });
  }
  throw new Error('Nguồn dữ liệu không được hỗ trợ. Dùng sitemap, urls hoặc wp.');
}

async function fetchAndExtract(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const html = await response.text();
    return { ...extractPageFromHtml(url, html, response.status), fetch_ms: Date.now() - startedAt };
  } catch (error) {
    return failedPage(url, error, Date.now() - startedAt);
  }
}

async function handleCache(options, data) {
  if (!options.cacheEnabled) return { enabled: false, cache_path: null, delta: null };
  const cachePaths = getCachePaths(options.cacheDir, options.url);
  const snapshot = buildAuditSnapshot({ inputUrl: options.url, ...data });
  const previous = await readPreviousAudit(cachePaths);
  const delta = compareAuditSnapshots(previous, snapshot);
  await writeCurrentAudit(cachePaths, snapshot);
  return { enabled: true, cache_path: cachePaths.lastAuditPath, site_key: cachePaths.siteKey, delta };
}

function buildOutputPaths(outDir, inputUrl) {
  const siteSlug = siteSlugFromUrl(inputUrl);
  return {
    inventoryJson: path.join(outDir, 'inventory.json'),
    findingsJson: path.join(outDir, 'rule_findings.json'),
    clustersJson: path.join(outDir, 'clusters.json'),
    llmCandidatesJson: path.join(outDir, 'llm_candidates.json'),
    llmDecisionsJson: path.join(outDir, 'llm_decisions.json'),
    llmLog: path.join(outDir, 'llm_calls.jsonl'),
    cacheSummaryJson: path.join(outDir, 'cache_summary.json'),
    inventoryCsv: path.join(outDir, `inventory-${siteSlug}.csv`),
    actionPlanCsv: path.join(outDir, `action-plan-${siteSlug}.csv`),
    markdown: path.join(outDir, `report-${siteSlug}.md`),
    html: path.join(outDir, `report-${siteSlug}.html`)
  };
}

function siteSlugFromUrl(input) {
  try {
    const host = new URL(input).hostname.replace(/^www\./i, '').toLowerCase();
    return host.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site';
  } catch {
    return 'site';
  }
}

function baseOutput(options, generatedAt, totalUrls) {
  return { tool: 'content-audit-pro', version: '0.1.0', primary_language: 'vi', generated_at: generatedAt, source: options.source, input_url: options.url, total_urls: totalUrls };
}

function summarizeFindings(findings) {
  const summary = { total: findings.length, average_score: 0, healthy: 0, needs_review: 0, weak: 0, high_risk: 0 };
  if (!findings.length) return summary;
  summary.average_score = Math.round(findings.reduce((sum, item) => sum + item.server_score, 0) / findings.length);
  for (const item of findings) if (summary[item.severity] !== undefined) summary[item.severity] += 1;
  return summary;
}

function summarizeClusters(clusters) {
  return { total: clusters.length, high: clusters.filter((item) => item.risk === 'high').length, medium: clusters.filter((item) => item.risk === 'medium').length, low: clusters.filter((item) => item.risk === 'low').length };
}

function summarizeSource(inventory, options) {
  const wpItems = inventory.filter((page) => page.source_type === 'wordpress_rest');
  return {
    source: options.source,
    total_urls: inventory.length,
    wordpress_rest_items: wpItems.length,
    wordpress_posts: wpItems.filter((page) => page.wp_type === 'posts').length,
    wordpress_pages: wpItems.filter((page) => page.wp_type === 'pages').length,
    read_only: options.source === 'wp'
  };
}

function printSummary(summary, clusterSummary, cacheSummary, llmCandidateSummary, llmDecisions, sourceSummary) {
  console.log('Tóm tắt nguồn dữ liệu:');
  console.log(`- Nguồn: ${sourceSummary.source}`);
  if (sourceSummary.source === 'wp') {
    console.log('- WordPress REST: read-only');
    console.log(`- Posts: ${sourceSummary.wordpress_posts}`);
    console.log(`- Pages: ${sourceSummary.wordpress_pages}`);
  }
  console.log('Tóm tắt chấm điểm nội dung:');
  console.log(`- Tổng URL: ${summary.total}`);
  console.log(`- Điểm trung bình: ${summary.average_score}/100`);
  console.log(`- Tốt: ${summary.healthy}`);
  console.log(`- Cần rà soát: ${summary.needs_review}`);
  console.log(`- Yếu: ${summary.weak}`);
  console.log(`- Rủi ro cao: ${summary.high_risk}`);
  console.log('Tóm tắt cụm trùng lặp/chồng chéo:');
  console.log(`- Tổng cụm: ${clusterSummary.total}`);
  console.log('Tóm tắt ứng viên cần AI review:');
  console.log(`- Tổng ứng viên: ${llmCandidateSummary.total}`);
  console.log(`- Ưu tiên cao: ${llmCandidateSummary.high_priority}`);
  console.log(`- Page candidates: ${llmCandidateSummary.page_candidates}`);
  console.log(`- Cluster candidates: ${llmCandidateSummary.cluster_candidates}`);
  console.log('Tóm tắt kết quả AI review:');
  console.log(`- Đã bật LLM: ${llmDecisions.enabled ? 'Có' : 'Không'}`);
  console.log(`- Quyết định AI: ${llmDecisions.summary.total}`);
  console.log(`- Cần người duyệt: ${llmDecisions.summary.requires_human_approval}`);
  if (!llmDecisions.enabled && llmDecisions.reason) console.log(`- Lý do chưa gọi LLM: ${llmDecisions.reason}`);
  if (cacheSummary.enabled) {
    const d = cacheSummary.delta;
    console.log('Tóm tắt so sánh với lần audit trước:');
    console.log(`- Có cache trước đó: ${d.had_previous_cache ? 'Có' : 'Không'}`);
    console.log(`- URL mới: ${d.new_urls}`);
    console.log(`- URL thay đổi: ${d.changed_urls}`);
    console.log(`- URL không đổi: ${d.unchanged_urls}`);
    console.log(`- Vấn đề mới: ${d.new_issues}`);
    console.log(`- Vấn đề đã xử lý: ${d.fixed_issues}`);
    console.log(`- Vấn đề còn tồn tại: ${d.persistent_issues}`);
  }
}

function printOutputPaths(paths) {
  console.log('Hoàn tất kiểm tra website.');
  console.log(`Đã xuất inventory JSON tại: ${paths.inventoryJson}`);
  console.log(`Đã xuất kết quả chấm điểm tại: ${paths.findingsJson}`);
  console.log(`Đã xuất cụm trùng lặp/chồng chéo tại: ${paths.clustersJson}`);
  console.log(`Đã xuất ứng viên cần AI review tại: ${paths.llmCandidatesJson}`);
  console.log(`Đã xuất quyết định AI review tại: ${paths.llmDecisionsJson}`);
  console.log(`Đã xuất tóm tắt cache/delta tại: ${paths.cacheSummaryJson}`);
  console.log(`Đã xuất báo cáo HTML tại: ${paths.html}`);
}

function failedPage(url, error, fetchMs) {
  return { url, status: null, ok: false, canonical: null, title: '', meta_description: '', h1: [], h2: [], h3: [], word_count: 0, internal_links: [], external_links: [], images_total: 0, images_missing_alt: 0, published_at: null, modified_at: null, category: null, tags: [], content_hash: '', fetched_at: new Date().toISOString(), fetch_ms: fetchMs, error: error.message };
}

main().catch((error) => {
  console.error(`Lỗi khi kiểm tra website: ${error.message}`);
  process.exitCode = 1;
});
