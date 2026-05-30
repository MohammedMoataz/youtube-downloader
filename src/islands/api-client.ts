// Typed wrapper around the extraction-service HTTP contract
// (specs/001-youtube-downloader/contracts/extraction-service.md).
// No secret is sent from the browser; the service is CORS-allowed (constitution Principle I).

import { config } from '../lib/config';
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

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  if (!config.downloaderApiBase) {
    throw new ApiError('no_config', 'Download service is not configured. Please try again later.');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${config.downloaderApiBase}${path}`, {
      ...init,
      signal: init.signal ?? ctrl.signal,
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('timeout', 'The request took too long. Please try again.');
    }
    throw new ApiError('network', 'Could not reach the download service. Check your connection and retry.');
  }
  clearTimeout(timer);

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
      // @ts-expect-error narrowed structurally; qualities are QualityOption[]
      it.qualities = it.qualities.filter((q) => q.heightPx <= MAX_HEIGHT_PX);
    });
  if (result.kind === 'video') cap([result.item]);
  else cap(result.playlist.items);
  return result;
}

export const api = {
  resolve(url: string, signal?: AbortSignal): Promise<ResolveResult> {
    return request<ResolveResult>('/resolve', {
      method: 'POST',
      body: JSON.stringify({ url }),
      signal,
    }).then(capQualities);
  },

  async createJob(req: DownloadRequest): Promise<{ jobId: string; status: string }> {
    if (req.format === 'mp4' && !req.qualityId) {
      throw new ApiError('bad_request', 'Please choose a video quality before downloading.');
    }
    const payload =
      req.format === 'mp3' ? { source: req.source, id: req.id, format: 'mp3' } : req;
    return request('/jobs', { method: 'POST', body: JSON.stringify(payload) });
  },

  getJob(jobId: string): Promise<DownloadJob> {
    return request<DownloadJob>(`/jobs/${encodeURIComponent(jobId)}`);
  },

  cancelJob(jobId: string): Promise<DownloadJob> {
    return request<DownloadJob>(`/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' });
  },

  fileUrl(jobId: string): string {
    return `${config.downloaderApiBase}/jobs/${encodeURIComponent(jobId)}/file`;
  },
};
