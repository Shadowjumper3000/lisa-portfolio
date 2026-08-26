#!/bin/sh
# Gate the Go API on its two in-container dependencies.
#
# supervisord has no dependency ordering, and the API calls log.Fatalf when
# migrations fail — without this gate it would crash-loop noisily on every boot
# until Postgres finished its own startup.
set -eu

DB_PORT="${DB_PORT:-5432}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-127.0.0.1:9000}"

wait_for() {
    name="$1"
    max="$2"
    shift 2
    i=0
    while [ "$i" -lt "$max" ]; do
        if "$@" >/dev/null 2>&1; then
            echo "start-api: ${name} is ready"
            return 0
        fi
        i=$((i + 1))
        sleep 1
    done
    echo "start-api: timed out after ${max}s waiting for ${name}" >&2
    return 1
}

wait_for postgres 120 pg_isready -h 127.0.0.1 -p "${DB_PORT}" -q
wait_for minio 120 curl -fsS "http://${MINIO_ENDPOINT}/minio/health/live"

exec "$@"
