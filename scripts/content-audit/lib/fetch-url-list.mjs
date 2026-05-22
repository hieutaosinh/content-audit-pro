import { readFile } from 'node:fs/promises';
import { normalizeUrl, uniqueUrls } from './normalize-url.mjs';

export async function fetchUrlList(filePath, options = {}) {
  const { limit = 50 } = options;
  const content = await readFile(filePath, 'utf8');

  return uniqueUrls(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => normalizeUrl(line))
  ).slice(0, limit);
}
