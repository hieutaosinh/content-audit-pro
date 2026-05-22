import { writeFile } from 'node:fs/promises';

export async function writeHtmlReport(filePath, report) {
  await writeFile(filePath, buildHtmlReport(report), 'utf8');
  return filePath;
}

export function buildHtmlReport(report) {
  const { generatedAt, inputUrl, source, summary, clusterSummary, cacheSummary, llmCandidateSummary, findings, clusters = [] } = report;
  const priorityItems = findings.filter((item) => ['high_risk', 'weak', 'needs_review'].includes(item.severity)).slice(0, 30);
  const priorityClusters = clusters.filter((item) => ['high', 'medium'].includes(item.risk)).slice(0, 20);

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Báo cáo Content Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f6f7f9; color: #17202a; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    h1, h2 { margin: 0 0 16px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; margin-bottom: 18px; box-shadow: 0 8px 24px rgba(0,0,0,0.04); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .metric { background: #f9fafb; border-radius: 12px; padding: 14px; }
    .metric strong { display: block; font-size: 24px; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #edf0f3; vertical-align: top; }
    th { background: #f9fafb; }
    .small { color: #5f6b7a; font-size: 14px; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; background: #eef2ff; font-size: 13px; }
    a { color: #1d4ed8; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>Báo cáo Content Audit</h1>
      <p class="small">Nguồn kiểm tra: ${escapeHtml(inputUrl)} | Loại nguồn: ${escapeHtml(source)} | Tạo lúc: ${escapeHtml(generatedAt)}</p>
      <p>${escapeHtml(buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary))}</p>
    </section>

    <section class="card"><h2>Tóm tắt điểm</h2><div class="grid">
      ${metric('Tổng URL', summary.total)}
      ${metric('Điểm trung bình', `${summary.average_score}/100`)}
      ${metric('Tốt', summary.healthy)}
      ${metric('Cần rà soát', summary.needs_review)}
      ${metric('Yếu', summary.weak)}
      ${metric('Rủi ro cao', summary.high_risk)}
      ${metric('Cụm chồng chéo', clusterSummary?.total ?? 0)}
      ${metric('Cần AI review', llmCandidateSummary?.total ?? 0)}
    </div></section>

    <section class="card"><h2>So sánh với lần audit trước</h2>${buildDeltaHtml(cacheSummary)}</section>
    <section class="card"><h2>Ứng viên cần AI review</h2>${buildLlmCandidateHtml(llmCandidateSummary)}</section>
    <section class="card"><h2>URL cần ưu tiên</h2>${buildPriorityTable(priorityItems)}</section>
    <section class="card"><h2>Cụm trùng lặp/chồng chéo</h2>${buildClusterTable(priorityClusters)}</section>
    <section class="card"><h2>Gợi ý xử lý</h2><ul>
      <li>Ưu tiên URL rủi ro cao và vấn đề còn tồn tại qua nhiều lần audit.</li>
      <li>Với trang yếu, kiểm tra title, meta description, H1/H2, độ dài nội dung và internal link.</li>
      <li>Với cụm trùng lặp/chồng chéo, chưa tự merge/redirect; cần review thủ công để chọn bài trụ cột.</li>
      <li>Chỉ gửi các URL/cụm trong <code>llm_candidates.json</code> sang AI để tiết kiệm token.</li>
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
  </div><p class="small">Chi tiết nằm trong file <code>llm_candidates.json</code>. Đây là danh sách nên gửi sang AI ở phase sau, thay vì gửi toàn bộ website.</p>`;
}

function buildPriorityTable(items) {
  if (!items.length) return '<p>Chưa có URL cần ưu tiên trong lần kiểm tra này.</p>';
  const rows = items.map((item) => `<tr><td><a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.url)}</a></td><td>${escapeHtml(item.server_score)}</td><td><span class="badge">${escapeHtml(item.severity_vi)}</span></td><td>${escapeHtml((item.notes_vi || []).slice(0, 3).join('; '))}</td></tr>`).join('');
  return `<table><thead><tr><th>URL</th><th>Điểm</th><th>Mức độ</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildClusterTable(items) {
  if (!items.length) return '<p>Chưa phát hiện cụm trùng lặp/chồng chéo cần ưu tiên.</p>';
  const rows = items.map((item) => `<tr><td>${escapeHtml(item.cluster_id)}</td><td>${escapeHtml(item.topic_hint)}</td><td>${escapeHtml(item.url_count)}</td><td><span class="badge">${escapeHtml(item.risk)}</span></td><td>${escapeHtml(item.server_reason)}</td></tr>`).join('');
  return `<table><thead><tr><th>Cluster</th><th>Chủ đề gợi ý</th><th>Số URL</th><th>Rủi ro</th><th>Lý do</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary) {
  if (cacheSummary?.delta?.persistent_issues > 0) return 'Website còn vấn đề lặp lại qua nhiều lần audit, nên ưu tiên xử lý nhóm này.';
  if ((llmCandidateSummary?.high_priority || 0) > 0) return 'Có ứng viên ưu tiên cao cần AI review, nên xử lý nhóm này trước khi tạo kế hoạch content sâu hơn.';
  if (summary.total === 0) return 'Chưa có URL nào được kiểm tra.';
  if ((clusterSummary?.high || 0) > 0) return 'Website có cụm nội dung rủi ro cao, nên review khả năng trùng lặp/cannibalization trước.';
  if (summary.high_risk > 0) return 'Website có URL rủi ro cao, nên xử lý nhóm này trước.';
  if ((clusterSummary?.medium || 0) > 0) return 'Website có cụm nội dung chồng chéo, nên rà soát để tránh phân tán tín hiệu SEO.';
  return 'Các URL đang ở trạng thái tương đối tốt theo rule-based scoring hiện tại.';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}
