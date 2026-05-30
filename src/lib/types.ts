// Shared client-side view models (see specs/001-youtube-downloader/data-model.md).
// The site persists nothing server-side; these are the shapes held in memory and
// exchanged with the extraction service (contracts/extraction-service.md).

export type LinkKind = 'video' | 'playlist' | 'invalid';

export interface MediaLink {
  raw: string;
  kind: LinkKind;
  id: string | null;
}

export interface QualityOption {
  id: string;
  label: string;
  heightPx: number;
  container: 'mp4';
}

export interface MediaItem {
  id: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  durationSeconds: number;
  qualities: QualityOption[];
  audioAvailable: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  items: MediaItem[];
  count: number;
}

export type DownloadFormat = 'mp4' | 'mp3';

export interface DownloadRequest {
  source: 'video' | 'playlist';
  id: string;
  format: DownloadFormat;
  qualityId: string | null;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
export type JobItemState = 'pending' | 'running' | 'done' | 'failed';

export interface JobItemStatus {
  itemId: string;
  title: string;
  status: JobItemState;
  progress: number;
}

export interface DownloadJob {
  jobId: string;
  status: JobStatus;
  overallProgress: number;
  items: JobItemStatus[];
  resultKind: 'file' | 'zip' | null;
  resultUrl: string | null;
  error: string | null;
}

export type ResolveResult =
  | { kind: 'video'; item: MediaItem }
  | { kind: 'playlist'; playlist: Playlist };

/** Hard ceiling on offered video quality (clarification 2026-05-30). */
export const MAX_HEIGHT_PX = 1080;
