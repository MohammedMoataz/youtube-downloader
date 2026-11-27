// The website's extraction-service client, bound to the build-time PUBLIC_DOWNLOADER_API.
import { config } from '../lib/config';
import { createApi } from './api-client';

export const api = createApi(() => config.downloaderApiBase);
