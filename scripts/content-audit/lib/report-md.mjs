import { writeFile } from 'node:fs/promises';

export async function writeMarkdownReport(filePath, report) {
  await writeFile(filePath, buildMarkdownReport(report), 'utf8');
  return filePath;
}

export function buildMarkdownReport(report) {
  const { generatedAt, inputUrl, source, summary, findings } = report;
  const highRisk = findings.filter((item) => item.severity === 'high_risk');
  const weak = findings.filter((item) => item.severity === 'weak');
  const needsReview = findings.filter((item) => item.severity === 'needs_review');
  const topIssues = [...highRisk, ...weak, ...needsReview].slice(0, 20);

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

## Nhận định nhanh

${buildQuickComment(summary)}

## URL cần ưu tiên xử lý

${buildIssueTable(topIssues)}

## Gợi ý hành động

- Trang rủi ro cao: kiểm tra lại indexability, nội dung mỏng, lỗi fetch hoặc thiếu metadata nghiêm trọng.
- Trang yếu: ưu tiên cập nhật title, meta description, H1/H2, bổ sung nội dung và internal link.
- Trang cần rà soát: xem lại freshness, cấu trúc heading, độ sâu nội dung và khả năng trùng lặp.
- Trang tốt: giữ lại, chỉ cần theo dõi định kỳ.

## Lưu ý an toàn

Báo cáo này chỉ đưa ra khuyến nghị. Tool chưa tự động sửa WordPress, chưa tạo redirect, chưa noindex và chưa xóa nội dung.
`;
}

function buildQuickComment(summary) {
  if (summary.total === 0) return 'Chưa có URL nào được kiểm tra.';
  if (summary.high_risk > 0) return 'Website có một số URL rủi ro cao, nên xử lý nhóm này trước.';
  if (summary.weak > 0) return 'Website có nhiều URL yếu, nên ưu tiên tối ưu nội dung và metadata.';
  if (summary.needs_review > 0) return 'Phần lớn URL ở mức cần rà soát, nên cải thiện dần theo action plan.';
  return 'Các URL đang ở trạng thái tương đối tốt theo rule-based scoring hiện tại.';
}

function buildIssueTable(items) {
  if (!items.length) return 'Chưa có URL rủi ro hoặc cần ưu tiên trong lần kiểm tra này.';

  const rows = items.map((item) => `| ${escapePipe(item.url)} | ${item.server_score} | ${item.severity_vi} | ${escapePipe((item.notes_vi || []).slice(0, 3).join('; '))} |`);
  return ['| URL | Điểm | Mức độ | Ghi chú |', '| --- | ---: | --- | --- |', ...rows].join('\n');
}

function escapePipe(value) {
  return String(value || '').replace(/\|/g, '\\|');
}
