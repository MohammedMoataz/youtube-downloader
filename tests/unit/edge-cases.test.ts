import { describe, it, expect, vi, afterEach } from 'vitest';
import { classifyLink } from '../../src/islands/link-utils';
import { api, ApiError } from '../../src/islands/api-client';

afterEach(() => vi.restoreAllMocks());

describe('edge cases (T044/T050)', () => {
  it('invalid link is classified before any network call', () => {
    expect(classifyLink('https://vimeo.com/12345').kind).toBe('invalid');
  });

  it('unavailable content surfaces a friendly message', async () => {
    (globalThis.fetch as unknown) = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'unavailable', message: 'This content is unavailable.' } }),
    }));
    await expect(api.resolve('https://youtu.be/unavailable')).rejects.toBeInstanceOf(ApiError);
  });

  it('a request timeout maps to a retryable timeout error', async () => {
    (globalThis.fetch as unknown) = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(api.resolve('https://youtu.be/abc12345')).rejects.toMatchObject({ code: 'timeout' });
  });

  it('a network failure maps to a friendly network error', async () => {
    (globalThis.fetch as unknown) = vi.fn(async () => {
      throw new TypeError('failed to fetch');
    });
    await expect(api.resolve('https://youtu.be/abc12345')).rejects.toMatchObject({ code: 'network' });
  });
});
