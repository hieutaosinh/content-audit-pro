import thresholds from '../config/default-thresholds.json' with { type: 'json' };
import { getSeverity, getSeverityVi } from './severity.mjs';

export function scorePages(inventory, options = {}) {
  const config = options.thresholds || thresholds;
  const titleCounts = countBy(inventory, (page) => normalizeText(page.title));
  const metaCounts = countBy(inventory, (page) => normalizeText(page.meta_description));

  return inventory.map((page) => scorePage(page, { config, titleCounts, metaCounts }));
}

export function scorePage(page, context = {}) {
  const config = context.config || thresholds;
  const flags = [];
  const notes = [];
  const sections = {
    metadata: scoreMetadata(page, config, context, flags, notes),
    structure: scoreStructure(page, config, flags, notes),
    freshness: scoreFreshness(page, config, flags, notes),
    thinContent: scoreThinContent(page, config, flags, notes),
    duplicateRisk: scoreDuplicateRisk(page, context, flags, notes),
    internalLinks: scoreInternalLinks(page, config, flags, notes),
    taxonomy: scoreTaxonomy(page, flags, notes),
    technicalContentRisk: scoreTechnical(page, flags, notes)
  };

  const serverScore = clampScore(Object.values(sections).reduce((sum, value) => sum + value, 0));
  const severity = getSeverity(serverScore);

  return {
    url: page.url,
    server_score: serverScore,
    severity,
    severity_vi: getSeverityVi(severity),
    server_flags: flags,
    notes_vi: notes,
    score_sections: sections
  };
}

function scoreMetadata(page, config, context, flags, notes) {
  let score = config.scoreWeights.metadata;
  const title = page.title || '';
  const meta = page.meta_description || '';

  if (!title) {
    score -= 6;
    add(flags, notes, 'missing_title', 'Thiếu tiêu đề trang.');
  } else {
    if (title.length < config.title.minLength) {
      score -= 3;
      add(flags, notes, 'short_title', 'Tiêu đề hơi ngắn, nên viết rõ chủ đề hơn.');
    }
    if (title.length > config.title.maxLength) {
      score -= 3;
      add(flags, notes, 'long_title', 'Tiêu đề hơi dài, có thể bị cắt trên kết quả tìm kiếm.');
    }
  }

  if (!meta) {
    score -= 5;
    add(flags, notes, 'missing_meta', 'Thiếu meta description.');
  } else {
    if (meta.length < config.metaDescription.minLength) {
      score -= 2;
      add(flags, notes, 'short_meta', 'Meta description hơi ngắn.');
    }
    if (meta.length > config.metaDescription.maxLength) {
      score -= 2;
      add(flags, notes, 'long_meta', 'Meta description hơi dài.');
    }
  }

  if (!page.canonical) {
    score -= 2;
    add(flags, notes, 'missing_canonical', 'Chưa thấy canonical URL.');
  }

  return Math.max(0, score);
}

function scoreStructure(page, config, flags, notes) {
  let score = config.scoreWeights.structure;
  const h1Count = Array.isArray(page.h1) ? page.h1.length : 0;
  const h2Count = Array.isArray(page.h2) ? page.h2.length : 0;

  if (h1Count === 0) {
    score -= 5;
    add(flags, notes, 'missing_h1', 'Thiếu H1.');
  }

  if (h1Count > config.headings.maxH1Count) {
    score -= 4;
    add(flags, notes, 'multiple_h1', 'Có nhiều hơn một H1, nên kiểm tra lại cấu trúc heading.');
  }

  if (h2Count < config.headings.minH2Count && page.word_count >= config.thinContent.minWords) {
    score -= 3;
    add(flags, notes, 'low_h2_count', 'Bài dài nhưng ít H2, nên chia cấu trúc rõ hơn.');
  }

  if (page.images_total > 0) {
    const ratio = page.images_missing_alt / page.images_total;
    if (ratio > config.images.maxMissingAltRatio) {
      score -= 3;
      add(flags, notes, 'missing_image_alt', 'Nhiều ảnh đang thiếu alt text.');
    }
  }

  return Math.max(0, score);
}

function scoreFreshness(page, config, flags, notes) {
  let score = config.scoreWeights.freshness;
  const dateValue = page.modified_at || page.published_at;

  if (!dateValue) {
    score -= 3;
    add(flags, notes, 'missing_date', 'Chưa xác định được ngày đăng hoặc ngày cập nhật.');
    return Math.max(0, score);
  }

  const months = monthsSince(dateValue);
  if (months === null) return Math.max(0, score);

  if (months >= config.freshness.veryStaleAfterMonths) {
    score -= 7;
    add(flags, notes, 'very_stale_content', 'Nội dung đã rất lâu chưa cập nhật.');
  } else if (months >= config.freshness.staleAfterMonths) {
    score -= 4;
    add(flags, notes, 'stale_content', 'Nội dung nên được rà soát và cập nhật.');
  }

  return Math.max(0, score);
}

function scoreThinContent(page, config, flags, notes) {
  let score = config.scoreWeights.thinContent;
  const words = Number(page.word_count || 0);

  if (words <= 0) {
    score -= 12;
    add(flags, notes, 'empty_content', 'Không đọc được nội dung chính của trang.');
  } else if (words < config.thinContent.veryThinWords) {
    score -= 10;
    add(flags, notes, 'very_thin_content', 'Nội dung rất mỏng, cần kiểm tra lại giá trị SEO.');
  } else if (words < config.thinContent.minWords) {
    score -= 6;
    add(flags, notes, 'thin_content', 'Nội dung hơi mỏng so với chuẩn audit hiện tại.');
  }

  return Math.max(0, score);
}

function scoreDuplicateRisk(page, context, flags, notes) {
  let score = thresholds.scoreWeights.duplicateRisk;
  const title = normalizeText(page.title);
  const meta = normalizeText(page.meta_description);

  if (title && context.titleCounts?.get(title) > 1) {
    score -= 7;
    add(flags, notes, 'duplicate_title', 'Tiêu đề bị trùng với URL khác.');
  }

  if (meta && context.metaCounts?.get(meta) > 1) {
    score -= 6;
    add(flags, notes, 'duplicate_meta', 'Meta description bị trùng với URL khác.');
  }

  return Math.max(0, score);
}

function scoreInternalLinks(page, config, flags, notes) {
  let score = config.scoreWeights.internalLinks;
  const count = Array.isArray(page.internal_links) ? page.internal_links.length : 0;

  if (count === 0) {
    score -= 6;
    add(flags, notes, 'no_internal_links_detected', 'Chưa phát hiện internal link trong trang.');
  } else if (count < config.internalLinks.minOutbound) {
    score -= 3;
    add(flags, notes, 'low_internal_links', 'Internal link còn ít, nên bổ sung liên kết nội bộ phù hợp.');
  }

  return Math.max(0, score);
}

function scoreTaxonomy(page, flags, notes) {
  let score = thresholds.scoreWeights.taxonomy;

  if (!page.category) {
    score -= 3;
    add(flags, notes, 'missing_category', 'Chưa có dữ liệu category, cần bổ sung ở phase WordPress REST.');
  }

  if (Array.isArray(page.tags) && page.tags.length > 12) {
    score -= 4;
    add(flags, notes, 'tag_spam_risk', 'Trang có nhiều tag, cần kiểm tra nguy cơ tag spam.');
  }

  return Math.max(0, score);
}

function scoreTechnical(page, flags, notes) {
  let score = thresholds.scoreWeights.technicalContentRisk;

  if (!page.ok) {
    score -= 8;
    add(flags, notes, 'fetch_or_status_error', 'Trang không trả về trạng thái hợp lệ khi kiểm tra.');
  }

  if (page.status && page.status >= 300 && page.status < 400) {
    score -= 4;
    add(flags, notes, 'redirect_status', 'URL đang trả về trạng thái chuyển hướng.');
  }

  if (page.error) {
    score -= 6;
    add(flags, notes, 'fetch_error', `Lỗi khi tải trang: ${page.error}`);
  }

  return Math.max(0, score);
}

function add(flags, notes, flag, note) {
  if (!flags.includes(flag)) flags.push(flag);
  if (!notes.includes(note)) notes.push(note);
}

function countBy(items, getValue) {
  const map = new Map();
  for (const item of items || []) {
    const value = getValue(item);
    if (!value) continue;
    map.set(value, (map.get(value) || 0) + 1);
  }
  return map;
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function monthsSince(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}
