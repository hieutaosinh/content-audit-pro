import { writeFile } from 'node:fs/promises';

export async function writeCsvReport(filePath, rows, columns) {
  const header = columns.map((column) => csvEscape(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(resolveValue(row, column.key))).join(','));
  await writeFile(filePath, [header, ...body].join('\n') + '\n', 'utf8');
  return filePath;
}

export function buildInventoryRows(inventory) {
  return inventory.map((page) => ({
    url: page.url,
    status: page.status,
    ok: page.ok,
    title: page.title,
    meta_description: page.meta_description,
    h1: joinArray(page.h1),
    h2_count: Array.isArray(page.h2) ? page.h2.length : 0,
    h3_count: Array.isArray(page.h3) ? page.h3.length : 0,
    word_count: page.word_count,
    images_total: page.images_total,
    images_missing_alt: page.images_missing_alt,
    canonical: page.canonical,
    error: page.error
  }));
}

export function buildActionPlanRows(findings) {
  return findings.map((item) => ({
    url: item.url,
    server_score: item.server_score,
    severity: item.severity,
    severity_vi: item.severity_vi,
    recommended_action: recommendAction(item),
    requires_human_approval: requiresApproval(item),
    flags: joinArray(item.server_flags),
    notes_vi: joinArray(item.notes_vi)
  }));
}

export const inventoryColumns = [
  { key: 'url', header: 'url' },
  { key: 'status', header: 'status' },
  { key: 'ok', header: 'ok' },
  { key: 'title', header: 'title' },
  { key: 'meta_description', header: 'meta_description' },
  { key: 'h1', header: 'h1' },
  { key: 'h2_count', header: 'h2_count' },
  { key: 'h3_count', header: 'h3_count' },
  { key: 'word_count', header: 'word_count' },
  { key: 'images_total', header: 'images_total' },
  { key: 'images_missing_alt', header: 'images_missing_alt' },
  { key: 'canonical', header: 'canonical' },
  { key: 'error', header: 'error' }
];

export const actionPlanColumns = [
  { key: 'url', header: 'url' },
  { key: 'server_score', header: 'server_score' },
  { key: 'severity', header: 'severity' },
  { key: 'severity_vi', header: 'severity_vi' },
  { key: 'recommended_action', header: 'recommended_action' },
  { key: 'requires_human_approval', header: 'requires_human_approval' },
  { key: 'flags', header: 'flags' },
  { key: 'notes_vi', header: 'notes_vi' }
];

function recommendAction(item) {
  const flags = new Set(item.server_flags || []);

  if (item.severity === 'high_risk') return 'REVIEW_PRIORITY';
  if (flags.has('duplicate_title') || flags.has('duplicate_meta')) return 'REVIEW_DUPLICATE';
  if (flags.has('thin_content') || flags.has('very_thin_content')) return 'UPDATE_CONTENT';
  if (flags.has('missing_title') || flags.has('missing_meta') || flags.has('missing_h1')) return 'FIX_METADATA_STRUCTURE';
  if (item.severity === 'needs_review' || item.severity === 'weak') return 'UPDATE';
  return 'KEEP';
}

function requiresApproval(item) {
  const action = recommendAction(item);
  return ['REVIEW_PRIORITY', 'REVIEW_DUPLICATE'].includes(action);
}

function resolveValue(row, key) {
  return row[key] ?? '';
}

function joinArray(value) {
  return Array.isArray(value) ? value.join(' | ') : value || '';
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
