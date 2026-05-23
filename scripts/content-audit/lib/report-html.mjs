import { writeFile } from 'node:fs/promises';

export async function writeHtmlReport(filePath, report) {
  await writeFile(filePath, buildHtmlReport(report), 'utf8');
  return filePath;
}

export function buildHtmlReport(report) {
  const { generatedAt, inputUrl, source, sourceSummary, summary, clusterSummary, cacheSummary, llmCandidateSummary, llmDecisionSummary, inventory = [], findings, clusters = [] } = report;
  const priorityItems = findings.filter((item) => ['high_risk', 'weak', 'needs_review'].includes(item.severity)).slice(0, 30);
  const priorityClusters = clusters.filter((item) => ['high', 'medium'].includes(item.risk)).slice(0, 20);
  const extractionSummary = summarizeExtraction(inventory);

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Báo cáo Content Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f3f5f7; color: #17202a; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    h1, h2 { margin: 0 0 16px; }
    .card { background: #fff; border: 1px solid #dfe4ea; border-radius: 8px; padding: 20px; margin-bottom: 18px; box-shadow: 0 8px 24px rgba(15,23,42,0.04); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; border-radius: 8px; padding: 14px; }
    .metric strong { display: block; font-size: 24px; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #edf0f3; vertical-align: top; }
    th { background: #f9fafb; }
    .small { color: #5f6b7a; font-size: 14px; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; background: #eef2ff; font-size: 13px; font-weight: 700; }
    .badge.healthy { background: #dcfce7; color: #166534; }
    .badge.needs_review { background: #fef3c7; color: #92400e; }
    .badge.weak { background: #ffedd5; color: #9a3412; }
    .badge.high_risk { background: #fee2e2; color: #991b1b; }
    .row-healthy td { background: #fbfefc; }
    .row-needs_review td { background: #fffaf0; }
    .row-weak td { background: #fff7ed; }
    .row-high_risk td { background: #fff1f2; }
    .tier { border-left: 4px solid #2563eb; }
    a { color: #1d4ed8; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>Báo cáo Content Audit</h1>
      <p class="small">Nguồn kiểm tra: ${escapeHtml(inputUrl)} | Loại nguồn: ${escapeHtml(source)} | Tạo lúc: ${escapeHtml(generatedAt)}</p>
      <p>${escapeHtml(buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary, llmDecisionSummary, extractionSummary))}</p>
    </section>

    <section class="card tier"><h2>Hai tầng vận hành</h2><div class="grid">
      ${metric('Tầng 1', 'Rule-based report')}
      ${metric('Tầng 2', llmDecisionSummary?.total > 0 ? 'LLM optional đã bật' : 'LLM optional đang tắt')}
      ${metric('Chi phí LLM', llmDecisionSummary?.total > 0 ? 'Có phát sinh theo API' : 'Không phát sinh')}
    </div><p class="small">Report mặc định dùng rule-based scoring để ổn định, nhanh và dễ giải thích. LLM chỉ dùng khi bật riêng để review một số URL/cụm khó quyết định.</p></section>

    <section class="card"><h2>Tóm tắt nguồn dữ liệu</h2><div class="grid">
      ${metric('Nguồn', sourceSummary?.source || source)}
      ${metric('Tổng URL', sourceSummary?.total_urls ?? summary.total)}
      ${sourceSummary?.source === 'wp' ? metric('WordPress mode', 'Read-only') : ''}
      ${sourceSummary?.source === 'wp' ? metric('Posts', sourceSummary.wordpress_posts) : ''}
      ${sourceSummary?.source === 'wp' ? metric('Pages', sourceSummary.wordpress_pages) : ''}
    </div></section>

    <section class="card"><h2>Tóm tắt điểm</h2><div class="grid">
      ${metric('Tổng URL', summary.total)}
      ${metric('Điểm trung bình', `${summary.average_score}/100`)}
      ${metric('Tốt', summary.healthy)}
      ${metric('Cần rà soát', summary.needs_review)}
      ${metric('Yếu', summary.weak)}
      ${metric('Rủi ro cao', summary.high_risk)}
      ${metric('Cụm chồng chéo', clusterSummary?.total ?? 0)}
      ${metric('Cần AI review', llmCandidateSummary?.total ?? 0)}
      ${metric('AI decisions', llmDecisionSummary?.total ?? 0)}
    </div></section>

    <section class="card"><h2>Tóm tắt liên kết và hình ảnh</h2>${buildExtractionHtml(extractionSummary)}</section>
    <section class="card"><h2>So sánh với lần audit trước</h2>${buildDeltaHtml(cacheSummary)}</section>
    <section class="card"><h2>Ứng viên cần AI review</h2>${buildLlmCandidateHtml(llmCandidateSummary)}</section>
    <section class="card"><h2>Kết quả AI review</h2>${buildLlmDecisionHtml(llmDecisionSummary)}</section>
    <section class="card"><h2>URL cần ưu tiên</h2>${buildPriorityTable(priorityItems)}</section>
    <section class="card"><h2>Cụm trùng lặp/chồng chéo</h2>${buildClusterTable(priorityClusters)}</section>
    <section class="card"><h2>Gợi ý xử lý</h2><ul>
      <li>Ưu tiên URL rủi ro cao và vấn đề còn tồn tại qua nhiều lần audit.</li>
      <li>Với trang yếu, kiểm tra title, meta description, H1/H2, độ dài nội dung và internal link.</li>
      <li>Với trang có ít internal link, thêm liên kết đến bài liên quan, trang dịch vụ, danh mục hoặc bài trụ cột phù hợp.</li>
      <li>Với ảnh thiếu alt, bổ sung alt text mô tả tự nhiên, tránh nhồi keyword.</li>
      <li>Với cụm trùng lặp/chồng chéo, chưa tự merge/redirect; cần review thủ công để chọn bài trụ cột.</li>
      <li>Nếu dùng nguồn WordPress REST, kiểm tra thêm publish date, modified date, slug, category và tag trong <code>inventory.csv</code>.</li>
      <li>Chỉ gửi các URL/cụm trong <code>llm_candidates.json</code> sang AI để tiết kiệm token.</li>
      <li>Nếu đã bật <code>--use-llm</code>, xem <code>llm_decisions.json</code>; mọi quyết định AI đều là advisory-only.</li>
      <li>Tool hiện chỉ audit và xuất khuyến nghị, không tự sửa website.</li>
    </ul></section>
  </main>
</body>
</html>
`;
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function summarizeExtraction(inventory) {
  const pages = Array.isArray(inventory) ? inventory : [];
  const totalPages = pages.length;
  const totalInternalLinks = pages.reduce((sum, page) => sum + arrayLength(page.internal_links), 0);
  const totalExternalLinks = pages.reduce((sum, page) => sum + arrayLength(page.external_links), 0);
  const pagesWithoutInternalLinks = pages.filter((page) => arrayLength(page.internal_links) === 0).length;
  const pagesWithExternalNoInternal = pages.filter((page) => arrayLength(page.external_links) > 0 && arrayLength(page.internal_links) === 0).length;
  const totalImages = pages.reduce((sum, page) => sum + Number(page.images_total || 0), 0);
  const totalMissingAlt = pages.reduce((sum, page) => sum + Number(page.images_missing_alt || 0), 0);

  return {
    total_pages: totalPages,
    total_internal_links: totalInternalLinks,
    total_external_links: totalExternalLinks,
    average_internal_links: totalPages ? round(totalInternalLinks / totalPages) : 0,
    average_external_links: totalPages ? round(totalExternalLinks / totalPages) : 0,
    pages_without_internal_links: pagesWithoutInternalLinks,
    pages_with_external_no_internal: pagesWithExternalNoInternal,
    total_images: totalImages,
    total_images_missing_alt: totalMissingAlt,
    missing_alt_ratio: totalImages ? round((totalMissingAlt / totalImages) * 100) : 0
  };
}

function buildExtractionHtml(summary) {
  if (!summary || summary.total_pages === 0) return '<p>Chưa có dữ liệu liên kết/hình ảnh để tổng hợp.</p>';
  return `<div class="grid">
    ${metric('Internal links', summary.total_internal_links)}
    ${metric('Internal / URL', summary.average_internal_links)}
    ${metric('URL chưa có internal link', summary.pages_without_internal_links)}
    ${metric('External links', summary.total_external_links)}
    ${metric('External / URL', summary.average_external_links)}
    ${metric('External nhưng thiếu internal', summary.pages_with_external_no_internal)}
    ${metric('Tổng ảnh', summary.total_images)}
    ${metric('Ảnh thiếu alt', `${summary.total_images_missing_alt} (${summary.missing_alt_ratio}%)`)}
  </div><p class="small">Chi tiết từng URL nằm trong <code>inventory.json</code> và <code>inventory.csv</code>.</p>`;
}

function buildDeltaHtml(cacheSummary) {
  if (!cacheSummary?.enabled) return '<p>Cache đang tắt, chưa có dữ liệu so sánh.</p>';
  const delta = cacheSummary.delta;
  if (!delta?.had_previous_cache) return '<p>Đây là lần audit đầu tiên có cache, lần chạy sau sẽ có dữ liệu so sánh.</p>';
  return `<div class="grid">
    ${metric('URL mới', delta.new_urls)}
    ${metric('URL thay đổi', delta.changed_urls)}
    ${metric('URL không đổi', delta.unchanged_urls)}
    ${metric('URL biến mất', delta.removed_urls)}
    ${metric('Vấn đề mới', delta.new_issues)}
    ${metric('Đã xử lý', delta.fixed_issues)}
    ${metric('Còn tồn tại', delta.persistent_issues)}
  </div>`;
}

function buildLlmCandidateHtml(summary) {
  if (!summary || summary.total === 0) return '<p>Chưa có URL hoặc cụm nào đủ điều kiện dùng AI review trong lần kiểm tra này.</p>';
  return `<div class="grid">
    ${metric('Tổng ứng viên', summary.total)}
    ${metric('Ưu tiên cao', summary.high_priority)}
    ${metric('Ưu tiên trung bình', summary.medium_priority)}
    ${metric('Page candidates', summary.page_candidates)}
    ${metric('Cluster candidates', summary.cluster_candidates)}
  </div><p class="small">Chi tiết nằm trong file <code>llm_candidates.json</code>. Đây là danh sách nên gửi sang AI, thay vì gửi toàn bộ website.</p>`;
}

function buildLlmDecisionHtml(summary) {
  if (!summary || summary.total === 0) return '<p>Chưa có quyết định AI nào. Chạy thêm <code>--use-llm</code> và cấu hình <code>OPENAI_API_KEY</code> hoặc <code>LLM_API_KEY</code> nếu muốn tạo review.</p>';
  return `<div class="grid">
    ${metric('Tổng quyết định', summary.total)}
    ${metric('Review thành công', summary.reviewed)}
    ${metric('Lỗi', summary.failed)}
    ${metric('Lấy từ cache', summary.from_cache)}
    ${metric('Cần người duyệt', summary.requires_human_approval)}
  </div><p class="small">Chi tiết nằm trong file <code>llm_decisions.json</code>. Đây là khuyến nghị advisory-only, không phải lệnh tự động áp dụng.</p>`;
}

function buildPriorityTable(items) {
  if (!items.length) return '<p>Chưa có URL cần ưu tiên trong lần kiểm tra này.</p>';
  const rows = items.map((item) => `<tr class="row-${escapeAttr(item.severity)}"><td><a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a></td><td>${escapeHtml(item.server_score)}</td><td><span class="badge ${escapeAttr(item.severity)}">${escapeHtml(item.severity_vi)}</span></td><td>${escapeHtml((item.notes_vi || []).slice(0, 3).join('; '))}</td></tr>`).join('');
  return `<table><thead><tr><th>URL</th><th>Điểm</th><th>Mức độ</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildClusterTable(items) {
  if (!items.length) return '<p>Chưa phát hiện cụm trùng lặp/chồng chéo cần ưu tiên.</p>';
  const rows = items.map((item) => `<tr><td>${escapeHtml(item.cluster_id)}</td><td>${escapeHtml(item.topic_hint)}</td><td>${escapeHtml(item.url_count)}</td><td><span class="badge">${escapeHtml(item.risk)}</span></td><td>${escapeHtml(item.server_reason)}</td></tr>`).join('');
  return `<table><thead><tr><th>Cluster</th><th>Chủ đề gợi ý</th><th>Số URL</th><th>Rủi ro</th><th>Lý do</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary, llmDecisionSummary, extractionSummary) {
  if ((llmDecisionSummary?.requires_human_approval || 0) > 0) return 'Đã có quyết định AI advisory-only cần người duyệt trước khi áp dụng.';
  if (cacheSummary?.delta?.persistent_issues > 0) return 'Website còn vấn đề lặp lại qua nhiều lần audit, nên ưu tiên xử lý nhóm này.';
  if ((llmCandidateSummary?.high_priority || 0) > 0) return 'Có ứng viên ưu tiên cao cần AI review, nên xử lý nhóm này trước khi tạo kế hoạch content sâu hơn.';
  if (summary.total === 0) return 'Chưa có URL nào được kiểm tra.';
  if ((extractionSummary?.pages_without_internal_links || 0) > 0) return 'Một số URL chưa phát hiện internal link, nên ưu tiên bổ sung liên kết nội bộ phù hợp.';
  if ((clusterSummary?.high || 0) > 0) return 'Website có cụm nội dung rủi ro cao, nên review khả năng trùng lặp/cannibalization trước.';
  if (summary.high_risk > 0) return 'Website có URL rủi ro cao, nên xử lý nhóm này trước.';
  if ((clusterSummary?.medium || 0) > 0) return 'Website có cụm nội dung chồng chéo, nên rà soát để tránh phân tán tín hiệu SEO.';
  return 'Các URL đang ở trạng thái tương đối tốt theo rule-based scoring hiện tại.';
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
