# syntax=docker/dockerfile:1
# Static front-end: build with Node, serve the immutable output with nginx.

# --- build the static site ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# These are baked into the client bundle at build time (it's a static site).
# PUBLIC_DOWNLOADER_API must be reachable FROM THE BROWSER (host), not a compose name.
ARG PUBLIC_DOWNLOADER_API=http://localhost:8080
ARG BASE_PATH=/
ARG SITE_URL=
ENV PUBLIC_DOWNLOADER_API=$PUBLIC_DOWNLOADER_API \
    BASE_PATH=$BASE_PATH \
    SITE_URL=$SITE_URL
RUN npm run build

# --- serve with nginx --------------------------------------------------------------
FROM nginx:1.27-alpine AS serve
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
