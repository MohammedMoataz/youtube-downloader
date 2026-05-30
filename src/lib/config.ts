// Reads the only required configuration: the public base URL of the extraction service.
// No secret is ever embedded (constitution Principle I). Fails fast in dev if missing.

export interface AppConfig {
  downloaderApiBase: string;
}

function readBase(): string {
  // Astro exposes PUBLIC_-prefixed vars to client code via import.meta.env.
  const raw = import.meta.env.PUBLIC_DOWNLOADER_API as string | undefined;
  if (!raw || raw.trim() === '') {
    const msg =
      '[config] PUBLIC_DOWNLOADER_API is not set. Copy .env.example to .env and set the extraction-service URL.';
    if (import.meta.env.DEV) throw new Error(msg);
    // In production we avoid throwing during render; the UI surfaces a friendly error instead.
    console.error(msg);
    return '';
  }
  return raw.replace(/\/+$/, '');
}

export const config: AppConfig = {
  downloaderApiBase: readBase(),
};
