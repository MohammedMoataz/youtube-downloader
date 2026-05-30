import { describe, it, expect } from 'vitest';
import { classifyLink, extractVideoId, extractPlaylistId } from '../../src/islands/link-utils';

describe('classifyLink — video (US1)', () => {
  it('detects a standard watch link', () => {
    const r = classifyLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(r.kind).toBe('video');
    expect(r.id).toBe('dQw4w9WgXcQ');
  });

  it('detects a youtu.be short link', () => {
    const r = classifyLink('https://youtu.be/dQw4w9WgXcQ');
    expect(r.kind).toBe('video');
    expect(r.id).toBe('dQw4w9WgXcQ');
  });

  it('detects a Shorts link', () => {
    const r = classifyLink('https://www.youtube.com/shorts/abcd1234efg');
    expect(r.kind).toBe('video');
  });
});

describe('classifyLink — playlist (US3)', () => {
  it('treats a link with list= as a playlist', () => {
    const r = classifyLink('https://www.youtube.com/playlist?list=PLabcdef12345');
    expect(r.kind).toBe('playlist');
    expect(r.id).toBe('PLabcdef12345');
  });

  it('prefers playlist when both v= and list= are present', () => {
    const r = classifyLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabcdef 12345'.replace(' ', ''));
    expect(r.kind).toBe('playlist');
  });
});

describe('classifyLink — invalid', () => {
  it('rejects non-YouTube URLs', () => {
    expect(classifyLink('https://example.com/watch?v=abc').kind).toBe('invalid');
  });
  it('rejects gibberish', () => {
    expect(classifyLink('not a url').kind).toBe('invalid');
  });
  it('rejects non-http protocols', () => {
    expect(classifyLink('ftp://youtube.com/watch?v=abcdefgh').kind).toBe('invalid');
  });
});

describe('helpers', () => {
  it('extractVideoId returns null for missing v', () => {
    expect(extractVideoId(new URL('https://www.youtube.com/watch'))).toBeNull();
  });
  it('extractPlaylistId returns null off-host', () => {
    expect(extractPlaylistId(new URL('https://example.com/playlist?list=PLabcdefghij'))).toBeNull();
  });
});
