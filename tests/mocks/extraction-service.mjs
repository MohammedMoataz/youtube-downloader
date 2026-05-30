// Local mock of the extraction-service contract for development and e2e tests.
// Implements: POST /resolve, POST /jobs, GET /jobs/:id, GET /jobs/:id/file, POST /jobs/:id/cancel.
// NOT production code — it returns synthetic data so the static front-end is testable
// without a live yt-dlp backend. Run with: npm run mock-api
import { createServer } from 'node:http';

const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8787;
const jobs = new Map();

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const sampleQualities = [
  { id: '137', label: '1080p', heightPx: 1080, container: 'mp4' },
  { id: '136', label: '720p', heightPx: 720, container: 'mp4' },
  { id: '135', label: '480p', heightPx: 480, container: 'mp4' },
];

function item(id, n = '') {
  return {
    id,
    title: `Sample Video ${n || id}`,
    author: 'Mock Channel',
    thumbnailUrl: 'https://placehold.co/480x360/121826/2de2e6/png?text=Thumbnail',
    durationSeconds: 213,
    audioAvailable: true,
    qualities: sampleQualities,
  };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', ...CORS });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  if (req.method === 'POST' && p === '/resolve') {
    const { url: target } = await readBody(req);
    if (!target || typeof target !== 'string') {
      return json(res, 400, { error: { code: 'bad_request', message: 'A link is required.' } });
    }
    if (target.includes('unavailable')) {
      return json(res, 404, { error: { code: 'unavailable', message: 'This content is unavailable.' } });
    }
    if (target.includes('list=')) {
      const items = Array.from({ length: 3 }, (_, i) => item(`vid${i + 1}`, String(i + 1)));
      return json(res, 200, {
        kind: 'playlist',
        playlist: { id: 'PLmock', title: 'Mock Playlist', count: items.length, items },
      });
    }
    return json(res, 200, { kind: 'video', item: item('abc12345') });
  }

  if (req.method === 'POST' && p === '/jobs') {
    const body = await readBody(req);
    if (body.format === 'mp4' && !body.qualityId) {
      return json(res, 400, { error: { code: 'bad_request', message: 'A quality is required for MP4.' } });
    }
    const jobId = `job_${Math.abs(hash(JSON.stringify(body) + jobs.size))}`;
    const isPlaylist = body.source === 'playlist';
    jobs.set(jobId, {
      jobId,
      status: 'running',
      overallProgress: 0,
      resultKind: null,
      resultUrl: null,
      error: null,
      format: body.format,
      items: isPlaylist
        ? [
            { itemId: 'vid1', title: 'Sample Video 1', status: 'running', progress: 0 },
            { itemId: 'vid2', title: 'Sample Video 2', status: 'pending', progress: 0 },
            { itemId: 'vid3', title: 'Sample Video 3', status: 'pending', progress: 0 },
          ]
        : [{ itemId: body.id ?? 'abc12345', title: 'Sample Video', status: 'running', progress: 0 }],
    });
    return json(res, 202, { jobId, status: 'queued' });
  }

  const jobMatch = p.match(/^\/jobs\/([^/]+)(\/cancel|\/file)?$/);
  if (jobMatch) {
    const job = jobs.get(jobMatch[1]);
    if (!job) return json(res, 404, { error: { code: 'not_found', message: 'Job not found.' } });
    const suffix = jobMatch[2];

    if (suffix === '/cancel' && req.method === 'POST') {
      job.status = 'canceled';
      return json(res, 200, { jobId: job.jobId, status: 'canceled' });
    }

    if (suffix === '/file' && req.method === 'GET') {
      const ext = job.format === 'mp3' ? 'mp3' : job.resultKind === 'zip' ? 'zip' : 'mp4';
      const type =
        ext === 'mp3' ? 'audio/mpeg' : ext === 'zip' ? 'application/zip' : 'video/mp4';
      res.writeHead(200, {
        'content-type': type,
        'content-disposition': `attachment; filename="download.${ext}"`,
        ...CORS,
      });
      return res.end(Buffer.from('MOCK-FILE-CONTENT'));
    }

    if (!suffix && req.method === 'GET') {
      // Advance the simulation each poll so progress moves toward completion.
      if (job.status === 'running') {
        job.overallProgress = Math.min(100, job.overallProgress + 50);
        for (const it of job.items) {
          if (it.status === 'pending' && job.items.every((x) => x.status !== 'running')) {
            it.status = 'running';
          }
          if (it.status === 'running') it.progress = Math.min(100, it.progress + 50);
          if (it.progress >= 100) it.status = 'done';
        }
        if (job.overallProgress >= 100) {
          job.status = 'completed';
          job.resultKind = job.items.length > 1 ? 'zip' : 'file';
          job.resultUrl = `/jobs/${job.jobId}/file`;
        }
      }
      const { format, ...view } = job;
      void format;
      return json(res, 200, view);
    }
  }

  json(res, 404, { error: { code: 'not_found', message: 'Unknown endpoint.' } });
});

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h | 0;
}

server.listen(PORT, () => console.log(`[mock-api] extraction-service mock on http://localhost:${PORT}`));
