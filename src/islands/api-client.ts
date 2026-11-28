// Typed wrapper around the extraction-service HTTP contract
// (specs/001-youtube-downloader/contracts/extraction-service.md).
// No secret is sent from the browser; the service is CORS-allowed (constitution Principle I).

import { MAX_HEIGHT_PX } from '../lib/types';
import type { DownloadJob, DownloadRequest, ResolveResult } from '../lib/types';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
// Above the service's own 30 s lookup limit, so its error message arrives before we give up.
const RESOLVE_TIMEOUT_MS = 35_000;

async function request<T>(
  base: string,
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  if (!base) {
    throw new ApiError('no_config', 'Download service is not configured. Please try again later.');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // A caller's signal adds a way to cancel; it never replaces the time limit.
  const cancel = () => ctrl.abort();
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener('abort', cancel);
  try {
    return await send<T>(`${base}${path}`, init, ctrl.signal);
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
}

async function send<T>(url: string, init: RequestInit, signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('timeout', 'The request took too long. Please try again.');
    }
    throw new ApiError(
      'network',
      'Could not reach the download service. Check your connection and retry.'
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    let code = `http_${res.status}`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
      if (body?.error?.code) code = body.error.code;
    } catch {
      /* keep defaults */
    }
    throw new ApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

/** Filter out any video quality above the 1080p ceiling as a client-side safety net (FR-006). */
function capQualities(result: ResolveResult): ResolveResult {
  const cap = (items: { qualities: { heightPx: number }[] }[]) =>
    items.forEach((it) => {
      it.qualities = it.qualities.filter((q) => q.heightPx <= MAX_HEIGHT_PX);
    });
  if (result.kind === 'video') cap([result.item]);
  else cap(result.playlist.items);
  return result;
}

/**
 * Build a client for the extraction service. `getBase` is read on every call so callers
 * (the website's build-time config, the extension's runtime settings) can supply the URL.
 */
export function createApi(getBase: () => string) {
  return {
    resolve(url: string, signal?: AbortSignal): Promise<ResolveResult> {
      const init = { method: 'POST', body: JSON.stringify({ url }), signal };
      return request<ResolveResult>(getBase(), '/resolve', init, RESOLVE_TIMEOUT_MS).then(
        capQualities
      );
    },

    async createJob(req: DownloadRequest): Promise<{ jobId: string; status: string }> {
      if (req.format === 'mp4' && !req.qualityId) {
        throw new ApiError('bad_request', 'Please choose a video quality before downloading.');
      }
      const payload =
        req.format === 'mp3' ? { source: req.source, id: req.id, format: 'mp3' } : req;
      return request(getBase(), '/jobs', { method: 'POST', body: JSON.stringify(payload) });
    },

    getJob(jobId: string): Promise<DownloadJob> {
      return request<DownloadJob>(getBase(), `/jobs/${encodeURIComponent(jobId)}`);
    },

    cancelJob(jobId: string): Promise<DownloadJob> {
      return request<DownloadJob>(getBase(), `/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
      });
    },

    fileUrl(jobId: string): string {
      return `${getBase()}/jobs/${encodeURIComponent(jobId)}/file`;
    },
  };
}
