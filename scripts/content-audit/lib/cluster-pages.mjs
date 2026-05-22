export function clusterPages(inventory, findings = []) {
  const findingByUrl = new Map(findings.map((item) => [item.url, item]));
  const groups = new Map();

  addGroups(groups, inventory, 'duplicate_title', (page) => normalizeText(page.title));
  addGroups(groups, inventory, 'duplicate_meta', (page) => normalizeText(page.meta_description));
  addGroups(groups, inventory, 'similar_slug', (page) => slugTopic(page.url));
  addGroups(groups, inventory, 'similar_h1', (page) => normalizeText(firstValue(page.h1)));
  addKeywordOverlapGroups(groups, inventory);

  return [...groups.values()]
    .filter((cluster) => cluster.urls.length > 1)
    .map((cluster, index) => finalizeCluster(cluster, index + 1, findingByUrl));
}

function addGroups(groups, pages, type, getKey) {
  const buckets = new Map();

  for (const page of pages) {
    const key = getKey(page);
    if (!key || key.length < 8) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(page);
  }

  for (const [key, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const groupKey = `${type}:${key}`;
    groups.set(groupKey, {
      cluster_id: '',
      type,
      topic_hint: readableTopic(key),
      urls: bucket.map((page) => page.url),
      risk: 'medium',
      server_reason: reasonForType(type),
      cluster_hash: ''
    });
  }
}

function addKeywordOverlapGroups(groups, pages) {
  const buckets = new Map();

  for (const page of pages) {
    const topic = keywordTopic(page);
    if (!topic || topic.length < 8) continue;
    if (!buckets.has(topic)) buckets.set(topic, []);
    buckets.get(topic).push(page);
  }

  for (const [topic, bucket] of buckets) {
    if (bucket.length < 2) continue;
    const groupKey = `keyword_overlap:${topic}`;
    if (groups.has(groupKey)) continue;
    groups.set(groupKey, {
      cluster_id: '',
      type: 'keyword_overlap',
      topic_hint: readableTopic(topic),
      urls: bucket.map((page) => page.url),
      risk: 'low',
      server_reason: 'Các URL có dấu hiệu dùng cùng nhóm từ khóa chính.',
      cluster_hash: ''
    });
  }
}

function finalizeCluster(cluster, index, findingByUrl) {
  const scores = cluster.urls
    .map((url) => findingByUrl.get(url)?.server_score)
    .filter((score) => Number.isFinite(score));
  const minScore = scores.length ? Math.min(...scores) : 100;
  const highRiskCount = cluster.urls.filter((url) => findingByUrl.get(url)?.severity === 'high_risk').length;

  let risk = cluster.risk;
  if (highRiskCount > 0 || minScore < 40) risk = 'high';
  else if (minScore < 60 || cluster.urls.length >= 3) risk = 'medium';

  return {
    ...cluster,
    cluster_id: `cluster-${String(index).padStart(3, '0')}`,
    risk,
    url_count: cluster.urls.length,
    cluster_hash: simpleHash(`${cluster.type}|${cluster.topic_hint}|${cluster.urls.sort().join('|')}`)
  };
}

function keywordTopic(page) {
  const text = `${page.title || ''} ${firstValue(page.h1) || ''}`;
  const tokens = tokenizeVi(text).slice(0, 5);
  return tokens.join(' ');
}

function slugTopic(url) {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop() || '';
    return last.replace(/[-_]+/g, ' ').trim().toLowerCase();
  } catch {
    return '';
  }
}

function tokenizeVi(value) {
  const stopwords = new Set(['va', 'la', 'cua', 'cho', 'voi', 'trong', 'tren', 'duoi', 'mot', 'cac', 'nhung', 'site', 'web', 'website']);
  return normalizeText(removeVietnameseMarks(value))
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function removeVietnameseMarks(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function readableTopic(value) {
  return String(value || '').slice(0, 120);
}

function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function reasonForType(type) {
  const reasons = {
    duplicate_title: 'Các URL có title trùng nhau.',
    duplicate_meta: 'Các URL có meta description trùng nhau.',
    similar_slug: 'Các URL có slug giống hoặc gần giống nhau.',
    similar_h1: 'Các URL có H1 giống nhau.'
  };
  return reasons[type] || 'Các URL có dấu hiệu trùng lặp hoặc chồng chéo nội dung.';
}

function simpleHash(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}
