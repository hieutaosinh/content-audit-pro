import { writeFile } from 'node:fs/promises';

export async function writeMarkdownReport(filePath, report) {
  await writeFile(filePath, buildMarkdownReport(report), 'utf8');
  return filePath;
}

export function buildMarkdownReport(report) {
  const { generatedAt, inputUrl, source, summary, clusterSummary, cacheSummary, llmCandidateSummary, findings, clusters = [] } = report;
  const highRisk = findings.filter((item) => item.severity === 'high_risk');
  const weak = findings.filter((item) => item.severity === 'weak');
  const needsReview = findings.filter((item) => item.severity === 'needs_review');
  const topIssues = [...highRisk, ...weak, ...needsReview].slice(0, 20);
  const priorityClusters = clusters.filter((item) => ['high', 'medium'].includes(item.risk)).slice(0, 20);

  return `# Báo cáo Content Audit

## Tổng quan

- Website / nguồn kiểm tra: ${inputUrl}
- Nguồn dữ liệu: ${source}
- Thời điểm tạo báo cáo: ${generatedAt}
- Tổng URL: ${summary.total}
- Điểm trung bình: ${summary.average_score}/100
- Tốt: ${summary.healthy}
- Cần rà soát: ${summary.needs_review}
- Yếu: ${summary.weak}
- Rủi ro cao: ${summary.high_risk}
- Cụm trùng lặp/chồng chéo: ${clusterSummary?.total ?? 0}
- Ứng viên cần AI review: ${llmCandidateSummary?.total ?? 0}

## Nhận định nhanh

${buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary)}

## So sánh với lần audit trước

${buildDeltaSection(cacheSummary)}

## Ứng viên cần AI review

${buildLlmCandidateSection(llmCandidateSummary)}

## URL cần ưu tiên xử lý

${buildIssueTable(topIssues)}

## Cụm trùng lặp/chồng chéo cần rà soát

${buildClusterTable(priorityClusters)}

## Gợi ý hành động

- Trang rủi ro cao: kiểm tra lại indexability, nội dung mỏng, lỗi fetch hoặc thiếu metadata nghiêm trọng.
- Trang yếu: ưu tiên cập nhật title, meta description, H1/H2, bổ sung nội dung và internal link.
- Cụm trùng lặp/chồng chéo: chưa tự merge/redirect; cần review thủ công để chọn bài trụ cột.
- Chỉ gửi các URL/cụm có trong `llm_candidates.json` sang AI để tiết kiệm token.
- Trang tốt: giữ lại, chỉ cần theo dõi định kỳ.

## Lưu ý an toàn

Báo cáo này chỉ đưa ra khuyến nghị. Tool chưa tự động sửa WordPress, chưa tạo redirect, chưa noindex và chưa xóa nội dung.
`;
}

function buildQuickComment(summary, clusterSummary, cacheSummary, llmCandidateSummary) {
  if (cacheSummary?.delta?.persistent_issues > 0) return 'Website còn một số vấn đề lặp lại qua nhiều lần audit, nên ưu tiên xử lý nhóm này.';
  if ((llmCandidateSummary?.high_priority || 0) > 0) return 'Có ứng viên ưu tiên cao cần AI review, nên xử lý nhóm này trước khi tạo kế hoạch content sâu hơn.';
  if (summary.total === 0) return 'Chưa có URL nào được kiểm tra.';
  if ((clusterSummary?.high || 0) > 0) return 'Website có cụm nội dung rủi ro cao, nên review khả năng trùng lặp/cannibalization trước.';
  if (summary.high_risk > 0) return 'Website có một số URL rủi ro cao, nên xử lý nhóm này trước.';
  if ((clusterSummary?.medium || 0) > 0) return 'Website có một số cụm nội dung chồng chéo, nên rà soát để tránh phân tán tín hiệu SEO.';
  if (summary.weak > 0) return 'Website có nhiều URL yếu, nên ưu tiên tối ưu nội dung và metadata.';
  if (summary.needs_review > 0) return 'Phần lớn URL ở mức cần rà soát, nên cải thiện dần theo action plan.';
  return 'Các URL đang ở trạng thái tương đối tốt theo rule-based scoring hiện tại.';
}

function buildDeltaSection(cacheSummary) {
  if (!cacheSummary?.enabled) return 'Cache đang tắt, chưa có dữ liệu so sánh.';
  const delta = cacheSummary.delta;
  if (!delta?.had_previous_cache) return 'Đây là lần audit đầu tiên có cache, lần chạy sau sẽ có dữ liệu so sánh.';

  return [
    `- URL mới: ${delta.new_urls}`,
    `- URL thay đổi nội dung: ${delta.changed_urls}`,
    `- URL không đổi: ${delta.unchanged_urls}`,
    `- URL không còn trong lần audit này: ${delta.removed_urls}`,
    `- Vấn đề mới: ${delta.new_issues}`,
    `- Vấn đề đã xử lý: ${delta.fixed_issues}`,
    `- Vấn đề còn tồn tại: ${delta.persistent_issues}`
  ].join('\n');
}

function buildLlmCandidateSection(summary) {
  if (!summary || summary.total === 0) return 'Chưa có URL hoặc cụm nào đủ điều kiện dùng AI review trong lần kiểm tra này.';

  return [
    `- Tổng ứng viên: ${summary.total}`,
    `- Ưu tiên cao: ${summary.high_priority}`,
    `- Ưu tiên trung bình: ${summary.medium_priority}`,
    `- Page candidates: ${summary.page_candidates}`,
    `- Cluster candidates: ${summary.cluster_candidates}`,
    '',
    'Chi tiết nằm trong file `llm_candidates.json`. Đây là danh sách nên gửi sang AI ở phase sau, thay vì gửi toàn bộ website.'
  ].join('\n');
}

function buildIssueTable(items) {
  if (!items.length) return 'Chưa có URL rủi ro hoặc cần ưu tiên trong lần kiểm tra này.';

  const rows = items.map((item) => `| ${escapePipe(item.url)} | ${item.server_score} | ${item.severity_vi} | ${escapePipe((item.notes_vi || []).slice(0, 3).join('; '))} |`);
  return ['| URL | Điểm | Mức độ | Ghi chú |', '| --- | ---: | --- | --- |', ...rows].join('\n');
}

function buildClusterTable(items) {
  if (!items.length) return 'Chưa phát hiện cụm trùng lặp/chồng chéo cần ưu tiên.';

  const rows = items.map((item) => `| ${item.cluster_id} | ${escapePipe(item.topic_hint)} | ${item.url_count} | ${item.risk} | ${escapePipe(item.server_reason)} |`);
  return ['| Cluster | Chủ đề gợi ý | Số URL | Rủi ro | Lý do |', '| --- | --- | ---: | --- | --- |', ...rows].join('\n');
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|');
}
