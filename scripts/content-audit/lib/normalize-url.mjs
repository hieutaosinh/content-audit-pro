export function normalizeUrl(input, baseUrl = null) {
  if (!input || typeof input !== 'string') return null;

  try {
    const url = baseUrl ? new URL(input.trim(), baseUrl) : new URL(input.trim());
    url.hash = '';

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '/');
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}

export function getHostname(input) {
  try {
    return new URL(input).hostname;
  } catch {
    return null;
  }
}

export function isSameHost(url, host) {
  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
}
