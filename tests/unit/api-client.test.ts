import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, createApi } from '../../src/islands/api-client';
import { api } from '../../src/islands/api';

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
    const spy = vi.fn(async () => ({
      ok: true,
      status: 202,
      json: async () => ({ jobId: 'j1', status: 'queued' }),
    }));
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

describe('createApi (custom base for other clients)', () => {
  it('uses the base from getBase at call time', async () => {
    mockFetchOnce(200, {
      kind: 'video',
      item: {
        id: 'abc12345',
        title: 'T',
        author: 'A',
        thumbnailUrl: 'x',
        durationSeconds: 1,
        audioAvailable: true,
        qualities: [],
      },
    });
    let base = 'http://one:1';
    const client = createApi(() => base);
    base = 'http://two:2';
    await client.resolve('https://youtu.be/abc12345');
    const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
    expect(fetchMock.mock.calls[0][0]).toBe('http://two:2/resolve');
    expect(client.fileUrl('j 1')).toBe('http://two:2/jobs/j%201/file');
  });

  it('rejects with no_config when the base is empty', async () => {
    await expect(createApi(() => '').resolve('x')).rejects.toMatchObject({ code: 'no_config' });
  });
});

describe('request time limits', () => {
  /** A fetch that never answers and rejects only when its signal aborts. */
  function mockHangingFetch() {
    (globalThis.fetch as unknown) = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          const fail = () => reject(new DOMException('aborted', 'AbortError'));
          if (init.signal?.aborted) fail();
          else init.signal?.addEventListener('abort', fail);
        })
    );
  }
  const client = createApi(() => 'http://x:1');
  const outcome = (p: Promise<unknown>) => {
    const state = { code: 'pending' };
    p.catch((e: ApiError) => (state.code = e.code));
    return state;
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('still times out a lookup when the caller passes a signal', async () => {
    mockHangingFetch();
    const state = outcome(client.resolve('u', new AbortController().signal));
    await vi.advanceTimersByTimeAsync(35_000);
    expect(state.code).toBe('timeout');
  });

  it('waits longer than the server lookup limit of 30 s', async () => {
    mockHangingFetch();
    const state = outcome(client.resolve('u'));
    await vi.advanceTimersByTimeAsync(31_000);
    expect(state.code).toBe('pending');
  });

  it('keeps the 15 s limit for status checks', async () => {
    mockHangingFetch();
    const state = outcome(client.getJob('j1'));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(state.code).toBe('timeout');
  });

  it('aborts as soon as the caller aborts', async () => {
    mockHangingFetch();
    const caller = new AbortController();
    const state = outcome(client.resolve('u', caller.signal));
    caller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.code).toBe('timeout');
  });

  it('does not start waiting when the signal is already aborted', async () => {
    mockHangingFetch();
    const caller = new AbortController();
    caller.abort();
    const state = outcome(client.resolve('u', caller.signal));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.code).toBe('timeout');
  });
});
