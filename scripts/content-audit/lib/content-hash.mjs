import { createHash } from 'node:crypto';

export function buildContentHash(parts = {}) {
  const normalized = normalizeForHash(parts);
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function normalizeForHash(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeForHash(item));
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        const normalized = normalizeForHash(value[key]);
        if (normalized !== undefined) result[key] = normalized;
        return result;
      }, {});
  }
  if (typeof value === 'string') return normalizeHashText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return undefined;
}

export function normalizeHashText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}
