// Detect/classify a pasted link as a YouTube video, playlist, or invalid (FR-003).
// Pure functions — unit-tested without a browser (tests/unit/link-utils.test.ts).

import type { MediaLink } from '../lib/types';

const VIDEO_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com']);

/** Extract a YouTube video id from common URL shapes, or null. */
export function extractVideoId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return isValidId(id) ? id : null;
  }
  if (VIDEO_HOSTS.has(url.hostname)) {
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      return v && isValidId(v) ? v : null;
    }
    const m = url.pathname.match(/^\/(?:shorts|embed|v)\/([^/?]+)/);
    if (m && isValidId(m[1])) return m[1];
  }
  return null;
}

/** Extract a YouTube playlist id, or null. */
export function extractPlaylistId(url: URL): string | null {
  if (!VIDEO_HOSTS.has(url.hostname)) return null;
  const list = url.searchParams.get('list');
  return list && /^[A-Za-z0-9_-]{10,}$/.test(list) ? list : null;
}

function isValidId(id: string | undefined): id is string {
  return !!id && /^[A-Za-z0-9_-]{8,}$/.test(id);
}

/**
 * Classify a raw input string.
 * A playlist link (has `list=`) is treated as a playlist even if it also names a video,
 * so "download all of its videos" works as the user expects.
 */
export function classifyLink(raw: string): MediaLink {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { raw: trimmed, kind: 'invalid', id: null };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { raw: trimmed, kind: 'invalid', id: null };
  }

  const playlistId = extractPlaylistId(url);
  if (playlistId) return { raw: trimmed, kind: 'playlist', id: playlistId };

  const videoId = extractVideoId(url);
  if (videoId) return { raw: trimmed, kind: 'video', id: videoId };

  return { raw: trimmed, kind: 'invalid', id: null };
}
