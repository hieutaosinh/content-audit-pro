export function getSeverity(score) {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'needs_review';
  if (score >= 40) return 'weak';
  return 'high_risk';
}

export function getSeverityVi(severity) {
  const labels = {
    healthy: 'Tốt',
    needs_review: 'Cần rà soát',
    weak: 'Yếu',
    high_risk: 'Rủi ro cao'
  };

  return labels[severity] || 'Không xác định';
}
