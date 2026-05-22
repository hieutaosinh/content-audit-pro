import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function getCachePaths(cacheRoot, inputUrl) {
  const siteKey = getSiteKey(inputUrl);
  const siteDir = path.join(cacheRoot, siteKey);

  return {
    siteKey,
    siteDir,
    lastAuditPath: path.join(siteDir, 'last-audit.json')
  };
}

export async function readPreviousAudit(cachePaths) {
  try {
    const content = await readFile(cachePaths.lastAuditPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function writeCurrentAudit(cachePaths, snapshot) {
  await mkdir(cachePaths.siteDir, { recursive: true });
  await writeFile(cachePaths.lastAuditPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return cachePaths.lastAuditPath;
}

export function buildAuditSnapshot({ generatedAt, inputUrl, inventory, findings, clusters }) {
  const findingByUrl = new Map(findings.map((item) => [item.url, item]));
  const clusterIdsByUrl = buildClusterIdsByUrl(clusters);

  return {
    version: 'content-audit-cache.v1',
    generated_at: generatedAt,
    input_url: inputUrl,
    pages: inventory.map((page) => {
      const finding = findingByUrl.get(page.url);
      return {
        url: page.url,
        content_hash: page.content_hash || '',
        title: page.title || '',
        status: page.status,
        server_score: finding?.server_score ?? null,
        severity: finding?.severity ?? null,
        server_flags: finding?.server_flags || [],
        cluster_ids: clusterIdsByUrl.get(page.url) || []
      };
    }),
    clusters: clusters.map((cluster) => ({
      cluster_id: cluster.cluster_id,
      cluster_hash: cluster.cluster_hash,
      risk: cluster.risk,
      urls: cluster.urls
    }))
  };
}

export function compareAuditSnapshots(previousSnapshot, currentSnapshot) {
  const previousPages = new Map((previousSnapshot?.pages || []).map((page) => [page.url, page]));
  const currentPages = new Map((currentSnapshot.pages || []).map((page) => [page.url, page]));

  const newUrls = [];
  const changedUrls = [];
  const unchangedUrls = [];
  const removedUrls = [];
  const newIssues = [];
  const fixedIssues = [];
  const persistentIssues = [];

  for (const page of currentPages.values()) {
    const previous = previousPages.get(page.url);

    if (!previous) {
      newUrls.push(page.url);
      if (isIssue(page)) newIssues.push(page.url);
      continue;
    }

    if ((previous.content_hash || '') !== (page.content_hash || '')) changedUrls.push(page.url);
    else unchangedUrls.push(page.url);

    const hadIssue = isIssue(previous);
    const hasIssue = isIssue(page);

    if (!hadIssue && hasIssue) newIssues.push(page.url);
    if (hadIssue && !hasIssue) fixedIssues.push(page.url);
    if (hadIssue && hasIssue) persistentIssues.push(page.url);
  }

  for (const previous of previousPages.values()) {
    if (!currentPages.has(previous.url)) removedUrls.push(previous.url);
  }

  return {
    had_previous_cache: Boolean(previousSnapshot),
    previous_generated_at: previousSnapshot?.generated_at || null,
    current_generated_at: currentSnapshot.generated_at,
    total_previous_urls: previousPages.size,
    total_current_urls: currentPages.size,
    new_urls: newUrls.length,
    changed_urls: changedUrls.length,
    unchanged_urls: unchangedUrls.length,
    removed_urls: removedUrls.length,
    new_issues: newIssues.length,
    fixed_issues: fixedIssues.length,
    persistent_issues: persistentIssues.length,
    samples: {
      new_urls: newUrls.slice(0, 20),
      changed_urls: changedUrls.slice(0, 20),
      removed_urls: removedUrls.slice(0, 20),
      new_issues: newIssues.slice(0, 20),
      fixed_issues: fixedIssues.slice(0, 20),
      persistent_issues: persistentIssues.slice(0, 20)
    }
  };
}

function buildClusterIdsByUrl(clusters) {
  const map = new Map();

  for (const cluster of clusters || []) {
    for (const url of cluster.urls || []) {
      if (!map.has(url)) map.set(url, []);
      map.get(url).push(cluster.cluster_id);
    }
  }

  return map;
}

function isIssue(page) {
  return ['needs_review', 'weak', 'high_risk'].includes(page?.severity);
}

function getSiteKey(inputUrl) {
  try {
    const url = new URL(inputUrl);
    return safeName(url.hostname || 'unknown-site');
  } catch {
    return safeName(inputUrl || 'unknown-site');
  }
}

function safeName(value) {
  return String(value || 'unknown-site')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-site';
}
