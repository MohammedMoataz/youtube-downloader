// Base-aware internal URL builder. Astro's import.meta.env.BASE_URL reflects the configured
// `base` and may or may not have a trailing slash ('/', '/youtube-downloader', or
// '/youtube-downloader/'), so we normalize and join slashes ourselves.

const BASE_NO_TRAILING = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Build an internal URL for a route slug (''=home), correct under any base path. */
export function withBase(slug = ''): string {
  const s = slug.replace(/^\/+/, '');
  if (!s) return BASE_NO_TRAILING === '' ? '/' : `${BASE_NO_TRAILING}/`;
  return BASE_NO_TRAILING === '' ? `/${s}` : `${BASE_NO_TRAILING}/${s}`;
}

/** Normalize a pathname for equality checks (drop trailing slashes; '' -> '/'). */
export function normPath(p: string): string {
  return p.replace(/\/+$/, '') || '/';
}
