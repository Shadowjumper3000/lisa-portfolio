# syntax=docker/dockerfile:1
#
# All-in-one image for portfolio-lisa: Postgres + MinIO + Go API + web tier,
# supervised by supervisord inside a single container.
#
# Targets:
#   development — Vite dev server (hot reload) in front of the Go API
#   production  — nginx serving the built SPA in front of the Go API
#
# Everything runs as uid/gid 999 (`postgres`). That uid is deliberate: it
# already owns the live cluster in data/db, so the existing database attaches
# with no chown and therefore no risk of a half-migrated data directory.
# Nothing in this image runs as root.

ARG MINIO_IMAGE=minio/minio:latest

###############################################################################
# Stage: web-builder — compile the React SPA
###############################################################################
FROM node:20-bookworm-slim AS web-builder

WORKDIR /usr/src/app

# package-lock.json is committed, so build reproducibly with `npm ci`.
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./

ARG VITE_CONTACT_EMAIL
ARG VITE_INSTAGRAM_URL
ARG VITE_TWITTER_URL
ENV VITE_CONTACT_EMAIL=${VITE_CONTACT_EMAIL} \
    VITE_INSTAGRAM_URL=${VITE_INSTAGRAM_URL} \
    VITE_TWITTER_URL=${VITE_TWITTER_URL}

RUN npm run build

###############################################################################
# Stage: go-builder — compile the API to a static binary
###############################################################################
FROM golang:1.20-bookworm AS go-builder

WORKDIR /src
COPY app/go.mod app/go.sum ./
RUN go mod download
COPY app/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/portfolio-server ./

###############################################################################
# Stage: minio-src — the MinIO server binary is static, so we just lift it out
###############################################################################
FROM ${MINIO_IMAGE} AS minio-src

###############################################################################
# Stage: runtime-base — Postgres 15 plus the supporting daemons
#
# The base MUST stay on the Debian/glibc postgres:15 image. The live cluster was
# initdb'd against glibc; moving it onto a musl base would silently change
# collation ordering and corrupt existing indexes.
###############################################################################
FROM postgres:15 AS runtime-base

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        supervisor \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=minio-src /usr/bin/minio /usr/local/bin/minio

# uid/gid 999 == the image's own `postgres` user. See header comment.
ENV APP_UID=999 \
    APP_GID=999 \
    HOME=/var/lib/postgresql

# MinIO object storage lives here. Creating it now, owned by 999, means a
# freshly created named volume inherits that ownership from the image.
RUN mkdir -p /var/lib/minio /app/migrations \
    && chown -R 999:999 /var/lib/minio /app

COPY db/migrations /app/migrations
COPY deploy/rootfs/usr/local/bin/start-api.sh /usr/local/bin/start-api.sh
RUN chmod 0755 /usr/local/bin/start-api.sh \
    && chown -R 999:999 /app/migrations

###############################################################################
# Stage: production — nginx serves the built SPA, proxies /api to the Go API
###############################################################################
FROM runtime-base AS production

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

COPY web/nginx.conf /etc/nginx/nginx.conf
COPY --from=web-builder /usr/src/app/dist /usr/share/nginx/html
COPY --from=go-builder /out/portfolio-server /usr/local/bin/portfolio-server
COPY deploy/rootfs/etc/supervisor/supervisord.prod.conf /etc/supervisor/supervisord.conf

# nginx runs unprivileged: give it writable pid/temp/log paths it owns, and
# never let it try to bind a port below 1024 (see `listen 8080` in nginx.conf).
RUN mkdir -p /var/lib/nginx/tmp /var/log/nginx \
    && chown -R 999:999 /var/lib/nginx /var/log/nginx /usr/share/nginx/html \
    && chmod 0755 /usr/local/bin/portfolio-server

USER 999:999

ENV APP_ADDR=127.0.0.1:8090 \
    DB_HOST=127.0.0.1 \
    DB_PORT=5432 \
    MINIO_ENDPOINT=127.0.0.1:9000 \
    MINIO_USE_SSL=false

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]

###############################################################################
# Stage: development — Vite dev server + `go run`, same single container
###############################################################################
FROM runtime-base AS development

# Node and Go toolchains, lifted from their official images rather than apt
# (Debian bookworm only ships Go 1.19, and app/go.mod requires 1.20).
COPY --from=golang:1.20-bookworm /usr/local/go /usr/local/go
COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:20-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

ENV PATH=/usr/local/go/bin:${PATH} \
    GOPATH=/opt/go \
    GOCACHE=/opt/go-cache \
    GOFLAGS=-mod=mod \
    NPM_CONFIG_CACHE=/opt/npm-cache

# Go sources + module cache, warmed at build time so container start is fast.
# (The old dev image ran `go mod tidy` on every boot; that needed network and a
# writable module cache at runtime, neither of which a non-root container wants.)
WORKDIR /app
COPY app/go.mod app/go.sum ./
RUN mkdir -p "$GOPATH" "$GOCACHE" "$NPM_CONFIG_CACHE" && go mod download
COPY app/ ./

WORKDIR /usr/src/app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./

COPY deploy/rootfs/etc/supervisor/supervisord.dev.conf /etc/supervisor/supervisord.conf

RUN chown -R 999:999 /app /usr/src/app /opt/go /opt/go-cache /opt/npm-cache

USER 999:999

ENV APP_ADDR=127.0.0.1:8090 \
    DB_HOST=127.0.0.1 \
    DB_PORT=5432 \
    MINIO_ENDPOINT=127.0.0.1:9000 \
    MINIO_USE_SSL=false \
    VITE_PROXY_TARGET=http://127.0.0.1:8090

EXPOSE 8080
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
