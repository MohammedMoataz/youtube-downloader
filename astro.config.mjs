// @ts-check
import { defineConfig } from 'astro/config';

// Base path & canonical site URL are env-driven so local dev / CI stay at root ('/'),
// while a GitHub Pages *project* build sets BASE_PATH (e.g. '/youtube-downloader') and
// SITE_URL (e.g. https://<user>.github.io). Internal links use import.meta.env.BASE_URL,
// so they resolve correctly under any base.
const base = process.env.BASE_PATH || '/';
const site = process.env.SITE_URL || undefined;

// Static site: no server runtime ships in the deployed bundle (constitution Principle I).
export default defineConfig({
  output: 'static',
  base,
  site,
  // The extraction-service base URL is read at build/runtime from PUBLIC_DOWNLOADER_API.
  // Astro exposes PUBLIC_-prefixed env vars to client code; no secret is ever embedded.
});
