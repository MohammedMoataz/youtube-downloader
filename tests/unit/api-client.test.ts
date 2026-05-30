import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../src/islands/api-client';

function mockFetchOnce(status: number, body: unknown) {
  (globalThis.fetch as unknown) = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('api.resolve (US1)', () => {
  it('returns a video and caps qualities at 1080p', async () => {
    mockFetchOnce(200, {
      kind: 'video',
      item: {
        id: 'abc12345',
        title: 'T',
        author: 'A',
        thumbnailUrl: 'x',
        durationSeconds: 1,
        audioAvailable: true,
        qualities: [
          { id: '313', label: '2160p', heightPx: 2160, container: 'mp4' },
          { id: '137', label: '1080p', heightPx: 1080, container: 'mp4' },
        ],
      },
    });
    const r = await api.resolve('https://youtu.be/abc12345');
    expect(r.kind).toBe('video');
    if (r.kind === 'video') {
      expect(r.item.qualities.map((q) => q.heightPx)).toEqual([1080]); // 2160p filtered out
    }
  });

  it('maps an error response to ApiError with a user-facing message', async () => {
    mockFetchOnce(404, { error: { code: 'unavailable', message: 'This content is unavailable.' } });
    await expect(api.resolve('https://youtu.be/unavailable')).rejects.toMatchObject({
      code: 'unavailable',
      message: 'This content is unavailable.',
    });
  });
});

describe('api.createJob (US1/US2)', () => {
  it('rejects an MP4 job without a quality', async () => {
    await expect(
      api.createJob({ source: 'video', id: 'abc12345', format: 'mp4', qualityId: null })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('omits qualityId for an MP3 job (US2)', async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 202, json: async () => ({ jobId: 'j1', status: 'queued' }) }));
    (globalThis.fetch as unknown) = spy;
    await api.createJob({ source: 'video', id: 'abc12345', format: 'mp3', qualityId: null });
    const sentBody = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody).not.toHaveProperty('qualityId');
    expect(sentBody.format).toBe('mp3');
  });
});

describe('api.getJob (polling)', () => {
  it('reads a completed job with a result url', async () => {
    mockFetchOnce(200, {
      jobId: 'j1',
      status: 'completed',
      overallProgress: 100,
      items: [],
      resultKind: 'file',
      resultUrl: '/jobs/j1/file',
      error: null,
    });
    const job = await api.getJob('j1');
    expect(job.status).toBe('completed');
    expect(job.resultUrl).toBe('/jobs/j1/file');
  });
});
