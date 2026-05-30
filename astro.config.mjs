// @ts-check
import { defineConfig } from 'astro/config';

// Static site: no server runtime ships in the deployed bundle (constitution Principle I).
export default defineConfig({
  output: 'static',
  // The extraction-service base URL is read at build/runtime from PUBLIC_DOWNLOADER_API.
  // Astro exposes PUBLIC_-prefixed env vars to client code; no secret is ever embedded.
});
