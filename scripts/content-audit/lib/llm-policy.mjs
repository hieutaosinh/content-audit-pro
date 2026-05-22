const SEMANTIC_PAGE_FLAGS = new Set([
  'thin_content',
  'very_thin_content',
  'empty_content',
  'stale_content',
  'very_stale_content',
  'duplicate_title',
  'duplicate_meta',
  'no_internal_links_detected',
  'low_internal_links'
]);

const PURELY_MEASURABLE_FLAGS = new Set([
  'missing_title',
  'short_title',
  'long_title',
  'missing_meta',
  'short_meta',
  'long_meta',
  'missing_canonical',
  'missing_h1',
  'multiple_h1',
  'low_h2_count',
  'missing_image_alt',
  'missing_date',
  'missing_category',
  'tag_spam_risk',
  'fetch_or_status_error',
  'redirect_status',
  'fetch_error'
]);

export function buildLlmCandidates({ inventory = [], findings = [], clusters = [] } = {}) {
  const pageByUrl = new Map(inventory.map((page) => [page.url, page]));
  const candidates = [
    ...buildClusterCandidates(clusters, findings),
    ...buildPageCandidates(findings, pageByUrl, clusters)
  ].sort(sortCandidates);

  return {
    summary: summarizeCandidates(candidates),
    candidates
  };
}

export function needsLlmForPage(finding, page = {}) {
  const flags = new Set(finding?.server_flags || []);
  const score = Number(finding?.server_score ?? 100);

  if (!finding) return decision(false, 'none', 'Không có dữ liệu finding.');
  if (finding.severity === 'healthy') return decision(false, 'low', 'Trang đang tốt theo rule-based scoring.');
  if (flags.has('fetch_error') || flags.has('fetch_or_status_error')) return decision(false, 'low', 'Lỗi kỹ thuật/fetch nên xử lý bằng kiểm tra kỹ thuật trước, chưa cần AI.');
  if (flags.has('redirect_status')) return decision(false, 'low', 'URL chuyển hướng là tín hiệu kỹ thuật, chưa cần AI đánh giá nội dung.');

  if (flags.has('duplicate_title') || flags.has('duplicate_meta')) {
    return decision(true, score < 50 ? 'high' : 'medium', 'Có dấu hiệu trùng metadata, cần AI hỗ trợ đánh giá khác biệt intent/nội dung.');
  }

  if (flags.has('thin_content') || flags.has('very_thin_content') || flags.has('empty_content')) {
    return decision(true, score < 50 ? 'high' : 'medium', 'Nội dung mỏng cần AI đánh giá topical depth và gợi ý hướng cập nhật.');
  }

  if (flags.has('stale_content') || flags.has('very_stale_content')) {
    return decision(true, 'medium', 'Nội dung cũ cần AI hỗ trợ xác định phần nên cập nhật.');
  }

  if ((page.word_count || 0) >= 500 && score < 60) {
    return decision(true, 'medium', 'Trang có nội dung đủ dài nhưng điểm yếu, cần AI xem xét chất lượng/ngữ nghĩa.');
  }

  if ([...flags].some((flag) => SEMANTIC_PAGE_FLAGS.has(flag))) {
    return decision(true, 'medium', 'Có flag cần đánh giá ngữ nghĩa trước khi quyết định update/merge/noindex.');
  }

  if ([...flags].every((flag) => PURELY_MEASURABLE_FLAGS.has(flag))) {
    return decision(false, 'low', 'Các lỗi hiện tại chủ yếu đo đếm được, nên sửa bằng rule/action plan trước.');
  }

  return decision(false, 'low', 'Chưa đủ tín hiệu để dùng AI hiệu quả.');
}

export function needsLlmForCluster(cluster, findingByUrl = new Map()) {
  if (!cluster || !Array.isArray(cluster.urls) || cluster.urls.length < 2) {
    return decision(false, 'low', 'Không phải cụm nhiều URL.');
  }

  const scores = cluster.urls
    .map((url) => findingByUrl.get(url)?.server_score)
    .filter((score) => Number.isFinite(score));
  const minScore = scores.length ? Math.min(...scores) : 100;
  const hasHighRiskPage = cluster.urls.some((url) => findingByUrl.get(url)?.severity === 'high_risk');

  if (cluster.risk === 'high' || hasHighRiskPage || minScore < 40) {
    return decision(true, 'high', 'Cụm rủi ro cao cần AI hỗ trợ phân tích intent, chọn pillar page và đề xuất merge/update/noindex an toàn.');
  }

  if (cluster.risk === 'medium' || cluster.urls.length >= 3) {
    return decision(true, 'medium', 'Cụm có dấu hiệu chồng chéo, cần AI đánh giá cannibalization trước khi ra quyết định.');
  }

  if (cluster.type === 'keyword_overlap') {
    return decision(true, 'medium', 'Cụm overlap từ khóa cần kiểm tra intent bằng AI vì rule-based chỉ thấy tín hiệu bề mặt.');
  }

  return decision(false, 'low', 'Cụm rủi ro thấp, có thể theo dõi bằng báo cáo trước.');
}

function buildPageCandidates(findings, pageByUrl, clusters) {
  const clusteredUrls = new Set(clusters.flatMap((cluster) => cluster.urls || []));

  return findings
    .map((finding) => {
      const page = pageByUrl.get(finding.url) || {};
      const llm = needsLlmForPage(finding, page);
      if (!llm.llm_needed) return null;

      return {
        candidate_id: `page-${simpleHash(finding.url)}`,
        type: 'page',
        url: finding.url,
        priority: llm.priority,
        llm_needed: true,
        status: 'pending_review',
        reason_vi: llm.reason_vi,
        recommended_prompt: 'page-quality-review.v1',
        review_goal: buildPageReviewGoal(finding, clusteredUrls.has(finding.url)),
        score: finding.server_score,
        severity: finding.severity,
        flags: finding.server_flags || [],
        notes_vi: finding.notes_vi || [],
        cache_key: page.content_hash || simpleHash(`${finding.url}|${finding.server_score}|${(finding.server_flags || []).join('|')}`)
      };
    })
    .filter(Boolean);
}

function buildClusterCandidates(clusters, findings) {
  const findingByUrl = new Map(findings.map((finding) => [finding.url, finding]));

  return clusters
    .map((cluster) => {
      const llm = needsLlmForCluster(cluster, findingByUrl);
      if (!llm.llm_needed) return null;

      return {
        candidate_id: cluster.cluster_id,
        type: 'cluster',
        cluster_id: cluster.cluster_id,
        priority: llm.priority,
        llm_needed: true,
        status: 'pending_review',
        reason_vi: llm.reason_vi,
        recommended_prompt: 'content-cluster-review.v1',
        review_goal: 'Xác định intent từng URL, chọn URL trụ cột nếu có, và đề xuất keep/update/merge/noindex/redirect ở mức review thủ công.',
        topic_hint: cluster.topic_hint,
        risk: cluster.risk,
        urls: cluster.urls,
        url_count: cluster.url_count || cluster.urls.length,
        server_reason: cluster.server_reason,
        cache_key: cluster.cluster_hash || simpleHash(`${cluster.topic_hint}|${(cluster.urls || []).join('|')}`)
      };
    })
    .filter(Boolean);
}

function buildPageReviewGoal(finding, belongsToCluster) {
  const goals = ['Đánh giá chất lượng nội dung, search intent, topical depth và đề xuất update outline nếu cần.'];
  if (belongsToCluster) goals.push('Trang này cũng thuộc một cụm nội dung, cần tránh đề xuất gây cannibalization.');
  if ((finding.server_flags || []).some((flag) => ['thin_content', 'very_thin_content', 'empty_content'].includes(flag))) goals.push('Ưu tiên xác định liệu nên mở rộng nội dung, merge vào bài khác, hay giữ làm landing page ngắn.');
  return goals.join(' ');
}

function summarizeCandidates(candidates) {
  return {
    total: candidates.length,
    high_priority: candidates.filter((item) => item.priority === 'high').length,
    medium_priority: candidates.filter((item) => item.priority === 'medium').length,
    low_priority: candidates.filter((item) => item.priority === 'low').length,
    page_candidates: candidates.filter((item) => item.type === 'page').length,
    cluster_candidates: candidates.filter((item) => item.type === 'cluster').length
  };
}

function decision(llmNeeded, priority, reasonVi) {
  return { llm_needed: llmNeeded, priority, reason_vi: reasonVi };
}

function sortCandidates(a, b) {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  const typeRank = { cluster: 0, page: 1 };
  return (priorityRank[a.priority] - priorityRank[b.priority]) || (typeRank[a.type] - typeRank[b.type]) || String(a.candidate_id).localeCompare(String(b.candidate_id));
}

function simpleHash(value) {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}
