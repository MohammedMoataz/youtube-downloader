// Download flow orchestrator (progressive enhancement island).
// Drives: resolve -> preview/formats -> create job -> poll progress -> deliver file.
// Covers US1 (MP4), US2 (MP3 + metadata), US3 (playlist ZIP, per-item, cancel),
// error/retry (FR-014), and timeout + duplicate-submission guards (T050 / analysis C2).

import { api, ApiError } from './api-client';
import { classifyLink } from './link-utils';
import type { DownloadFormat, MediaItem, ResolveResult } from '../lib/types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const PLAYLIST_WARN_THRESHOLD = 25;
const POLL_INTERVAL_MS = 1000;

let current: ResolveResult | null = null;
let activeJobId: string | null = null;
let polling = false;

function fmtDuration(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function show(el: HTMLElement | null, on = true) {
  if (el) el.hidden = !on;
}

function setStatus(text: string | null) {
  const s = $('status');
  if (!s) return;
  if (text) {
    s.textContent = text;
    show(s, true);
  } else {
    show(s, false);
  }
}

function showError(message: string) {
  setStatus(null);
  const box = $('error');
  const msg = $('error-msg');
  if (msg) msg.textContent = message;
  show(box, true);
}

function clearError() {
  show($('error'), false);
}

function selectedFormat(): DownloadFormat {
  const checked = document.querySelector<HTMLInputElement>('input[name="format"]:checked');
  return checked?.value === 'mp3' ? 'mp3' : 'mp4';
}

function firstItem(result: ResolveResult): MediaItem {
  return result.kind === 'video' ? result.item : result.playlist.items[0];
}

function renderVideo(result: Extract<ResolveResult, { kind: 'video' }>) {
  const { item } = result;
  ($('preview-thumb') as HTMLImageElement | null)?.setAttribute('src', item.thumbnailUrl);
  const t = $('preview-title');
  if (t) t.textContent = item.title;
  const a = $('preview-author');
  if (a) a.textContent = item.author;
  const d = $('preview-duration');
  if (d) d.textContent = fmtDuration(item.durationSeconds);
  show($('preview'), true);
}

function renderPlaylist(result: Extract<ResolveResult, { kind: 'playlist' }>) {
  const { playlist } = result;
  const t = $('playlist-title');
  if (t) t.textContent = playlist.title;
  const c = $('playlist-count');
  if (c) c.textContent = String(playlist.count);
  const list = $('playlist-items');
  if (list) {
    list.innerHTML = '';
    for (const it of playlist.items) {
      const li = document.createElement('li');
      li.textContent = `${it.title} · ${it.author}`;
      list.appendChild(li);
    }
  }
  if (playlist.count > PLAYLIST_WARN_THRESHOLD) {
    const w = $('playlist-warning');
    if (w) {
      w.textContent = `This playlist has ${playlist.count} videos — the download may take a while and produce a large ZIP. You can cancel any time once it starts.`;
      show(w, true);
    }
  }
  show($('playlist'), true);
}

function populateQualities(result: ResolveResult) {
  const sel = $('quality') as HTMLSelectElement | null;
  if (!sel) return;
  sel.innerHTML = '';
  const item = firstItem(result);
  for (const q of item.qualities) {
    const opt = document.createElement('option');
    opt.value = q.id;
    opt.textContent = q.label;
    sel.appendChild(opt);
  }
  if (item.qualities.length === 0) {
    // No video formats: steer to MP3 if audio exists (edge case "no qualities available").
    const mp3 = document.querySelector<HTMLInputElement>('input[name="format"][value="mp3"]');
    if (mp3 && item.audioAvailable) mp3.checked = true;
  }
}

function syncFormatUI(result: ResolveResult) {
  const isMp3 = selectedFormat() === 'mp3';
  show($('quality-row'), !isMp3);
  show($('mp3-meta'), isMp3);
  if (isMp3) {
    const item = firstItem(result);
    const mt = $('meta-title');
    if (mt) mt.textContent = item.title;
    const ma = $('meta-author');
    if (ma) ma.textContent = item.author;
    const mc = $('meta-cover');
    if (mc) mc.textContent = item.thumbnailUrl ? 'embedded ✓' : 'unavailable';
  }
}

async function resolveAndRender(raw: string) {
  clearError();
  const link = classifyLink(raw);
  if (link.kind === 'invalid' || !link.id) {
    showError("That doesn't look like a YouTube video or playlist link. Please check it and try again.");
    return;
  }
  setStatus('Fetching details…');
  try {
    const result = await api.resolve(raw);
    current = result;
    setStatus(null);
    if (result.kind === 'video') renderVideo(result);
    else renderPlaylist(result);
    populateQualities(result);
    syncFormatUI(result);
    show($('formats'), true);
  } catch (err) {
    current = null;
    showError(err instanceof ApiError ? err.message : 'Something went wrong while fetching details.');
  }
}

function renderJobItems(items: { itemId: string; title: string; status: string; progress: number }[]) {
  const list = $('job-items');
  const tpl = $('job-item-tpl') as HTMLTemplateElement | null;
  if (!list || !tpl) return;
  if (items.length <= 1) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = '';
  for (const it of items) {
    const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
    node.dataset.state = it.status;
    node.querySelector('.job-item-title')!.textContent = it.title;
    node.querySelector('.job-item-status')!.textContent =
      it.status === 'failed' ? 'failed' : it.status === 'done' ? 'done' : `${it.progress}%`;
    list.appendChild(node);
  }
}

function updateOverall(pct: number, label: string) {
  const bar = $('overall-bar');
  if (bar) bar.style.width = `${pct}%`;
  const wrap = $('overall-bar-wrap');
  if (wrap) wrap.setAttribute('aria-valuenow', String(pct));
  const p = $('overall-pct');
  if (p) p.textContent = `${pct}%`;
  const l = $('progress-label');
  if (l) l.textContent = label;
}

function triggerDownload(jobId: string) {
  const link = $('download-link') as HTMLAnchorElement | null;
  const url = api.fileUrl(jobId);
  if (link) {
    link.href = url;
    show($('done-row'), true);
  }
  // Auto-start the browser download.
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function pollJob(jobId: string) {
  if (polling) return;
  polling = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const job = await api.getJob(jobId);
      renderJobItems(job.items ?? []);
      if (job.status === 'completed') {
        updateOverall(100, 'Ready!');
        triggerDownload(jobId);
        break;
      }
      if (job.status === 'failed') {
        showError(job.error ?? 'The download failed. Please try again.');
        break;
      }
      if (job.status === 'canceled') {
        updateOverall(job.overallProgress, 'Canceled');
        break;
      }
      updateOverall(job.overallProgress, 'Downloading…');
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  } catch (err) {
    showError(err instanceof ApiError ? err.message : 'Lost contact with the download service.');
  } finally {
    polling = false;
    if (activeJobId === jobId) activeJobId = null;
  }
}

async function startDownload() {
  if (!current) return;
  if (activeJobId) return; // duplicate-submission guard (T050 / FR edge case)
  clearError();
  const format = selectedFormat();
  const source = current.kind === 'playlist' ? 'playlist' : 'video';
  const id = current.kind === 'playlist' ? current.playlist.id : current.item.id;
  const qualityId = format === 'mp4' ? ($('quality') as HTMLSelectElement | null)?.value ?? null : null;

  show($('progress'), true);
  show($('cancel-btn'), source === 'playlist');
  updateOverall(0, 'Preparing…');

  try {
    const { jobId } = await api.createJob({ source, id, format, qualityId });
    activeJobId = jobId;
    void pollJob(jobId);
  } catch (err) {
    showError(err instanceof ApiError ? err.message : 'Could not start the download.');
  }
}

async function cancelDownload() {
  if (!activeJobId) return;
  try {
    await api.cancelJob(activeJobId);
    updateOverall(0, 'Canceled');
  } catch {
    /* best-effort cancel */
  } finally {
    activeJobId = null;
  }
}

function readInitialLink(): string | null {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('url');
  if (fromQuery) return fromQuery;
  try {
    return sessionStorage.getItem('yt-url');
  } catch {
    return null;
  }
}

export function initDownloader() {
  // Reveal the interactive UI (the no-JS notice is shown by default in the page).
  show($('needs-js'), false);
  show($('app'), true);

  $('start-btn')?.addEventListener('click', startDownload);
  $('cancel-btn')?.addEventListener('click', cancelDownload);
  $('retry-btn')?.addEventListener('click', () => {
    const raw = readInitialLink();
    if (raw) void resolveAndRender(raw);
  });
  document.querySelectorAll('input[name="format"]').forEach((el) =>
    el.addEventListener('change', () => {
      if (current) syncFormatUI(current);
    })
  );

  const raw = readInitialLink();
  if (raw) {
    void resolveAndRender(raw);
  } else {
    setStatus('Paste a link on the home page to get started.');
  }
}
