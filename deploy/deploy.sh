#!/bin/sh
#
# portfolio-lisa remote deploy script.
#
# Runs ON the deploy host. The workflow pipes it in over ssh:
#
#   ssh host "ENVIRONMENT=staging GIT_REF=main ... sh -s" < deploy/deploy.sh
#
# POSIX sh only — this executes in whatever login shell the deploy user has, so
# `set -o pipefail`, arrays and [[ ]] are out.
#
# No secret is ever passed in argv or the environment. The workflow writes them
# to $INCOMING_ENV over a separate ssh stdin first, and the trap below removes
# them however this script exits.

set -eu

###############################################################################
# Inputs — all non-secret
###############################################################################
: "${ENVIRONMENT:?ENVIRONMENT must be 'staging' or 'production'}"
: "${REPO_URL:?REPO_URL must be set}"
: "${GIT_REF:?GIT_REF must be set (branch or tag name)}"
: "${GIT_REF_TYPE:?GIT_REF_TYPE must be 'branch' or 'tag'}"

DEPLOY_ROOT="${DEPLOY_ROOT:-$HOME}"

case "$DEPLOY_ROOT" in
  ""|/|/home|/root)
    echo "❌ Refusing to deploy: DEPLOY_ROOT resolved to '$DEPLOY_ROOT'."
    exit 1
    ;;
esac

# Everything environment-specific is derived here, from ENVIRONMENT alone.
# Which directory and which data get touched is NOT accepted over the wire, so
# a malformed workflow input cannot aim a staging deploy at production data.
case "$ENVIRONMENT" in
  production)
    DEPLOY_DIR="$DEPLOY_ROOT/portfolio-lisa"
    COMPOSE_FILE="docker-compose.prod.yml"
    PROJECT="portfolio-lisa"
    CONTAINER="portfolio-lisa"
    ALLOW_BOOTSTRAP="no"
    ;;
  staging)
    DEPLOY_DIR="$DEPLOY_ROOT/portfolio-lisa-staging"
    COMPOSE_FILE="docker-compose.staging.yml"
    PROJECT="portfolio-lisa-staging"
    CONTAINER="portfolio-lisa-staging"
    ALLOW_BOOTSTRAP="yes"
    ;;
  *)
    echo "❌ ENVIRONMENT must be 'staging' or 'production', got '$ENVIRONMENT'"
    exit 1
    ;;
esac

INCOMING_ENV="$DEPLOY_ROOT/.portfolio-lisa-$ENVIRONMENT.env"
ENV_FILE="$DEPLOY_DIR/.env"
DB_DATA="$DEPLOY_DIR/data/db"
MINIO_DATA="$DEPLOY_DIR/data/minio"

# Secrets must not outlive the run, on any exit path.
trap 'rm -f "$INCOMING_ENV" "$ENV_FILE"' EXIT INT TERM

echo "▶ portfolio-lisa deploy"
echo "  environment : $ENVIRONMENT"
echo "  ref         : $GIT_REF ($GIT_REF_TYPE)"
echo "  directory   : $DEPLOY_DIR"
echo "  bootstrap   : $ALLOW_BOOTSTRAP"

if [ ! -f "$INCOMING_ENV" ]; then
  echo "❌ $INCOMING_ENV is missing — the workflow did not upload the environment file."
  exit 1
fi

###############################################################################
# 1. Sync the checkout
#
# NOTHING here may delete $DEPLOY_DIR. In production the live Postgres cluster
# and every gallery object live in $DEPLOY_DIR/data (host bind mounts), so an
# `rm -rf` on this path would destroy the database and all uploaded images with
# no recovery, and the pre-flight checks below run far too late to catch it.
###############################################################################
mkdir -p "$HOME/.ssh"
ssh-keyscan github.com >> "$HOME/.ssh/known_hosts" 2>/dev/null || true

checkout_ref() {
  if [ "$GIT_REF_TYPE" = "tag" ]; then
    git fetch --force --tags origin
    git checkout --force --detach "refs/tags/$GIT_REF"
  else
    git fetch --force origin "$GIT_REF"
    git checkout --force -B "$GIT_REF" "origin/$GIT_REF"
  fi
}

if [ -d "$DEPLOY_DIR/.git" ]; then
  echo "Updating existing checkout..."
  cd "$DEPLOY_DIR"
  git remote set-url origin "$REPO_URL"
  checkout_ref
elif [ -d "$DEPLOY_DIR" ]; then
  # The directory survived but its .git metadata did not. Re-attach the repo in
  # place rather than recreating the directory: `git checkout --force` only
  # writes paths present in the target tree, and data/ is gitignored, so live
  # data is never touched.
  echo "⚠️  $DEPLOY_DIR exists but is not a git repository — re-attaching in place."
  if [ -d "$DEPLOY_DIR/data" ]; then
    echo "   data/ is present and will be preserved."
  fi
  cd "$DEPLOY_DIR"
  git init -q
  git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
  checkout_ref
else
  echo "Cloning $REPO_URL..."
  git clone "$REPO_URL" "$DEPLOY_DIR"
  cd "$DEPLOY_DIR"
  checkout_ref
fi

echo "✅ Deploying $(git rev-parse --short HEAD)"

###############################################################################
# 2. Put the uploaded secrets in place
###############################################################################
mv "$INCOMING_ENV" "$ENV_FILE"
chmod 600 "$ENV_FILE"

cd "$DEPLOY_DIR/deploy"
COMPOSE="docker compose -p $PROJECT -f $COMPOSE_FILE --env-file $ENV_FILE"

###############################################################################
# 3. Pre-flight
#
# Runs BEFORE anything is stopped or built, so a failed check leaves whatever
# is currently running up and serving.
#
# The probes run inside a container as uid 999 rather than as the deploy user:
# PGDATA is mode 0700 owned by 999, so the deploy user cannot even stat inside.
###############################################################################
probe_writable() {
  docker run --rm -u 999:999 -v "$1":/probe alpine:3 \
    sh -c 'touch /probe/.write-probe && rm -f /probe/.write-probe' >/dev/null 2>&1
}

read_pgversion() {
  docker run --rm -u 999:999 -v "$1":/probe alpine:3 \
    sh -c 'cat /probe/PG_VERSION 2>/dev/null' 2>/dev/null || true
}

ensure_dir() {
  # $1 = path, $2 = human label
  if [ -d "$1" ]; then
    return 0
  fi
  if [ "$ALLOW_BOOTSTRAP" = "no" ]; then
    echo "❌ $1 does not exist. Refusing to deploy $ENVIRONMENT."
    echo "   The live $2 must already be there — starting without it would come"
    echo "   back as an empty site while the real data sits elsewhere on disk."
    exit 1
  fi
  echo "ℹ️  Creating $1 for the fresh $ENVIRONMENT environment."
  mkdir -p "$1"
  # Docker creates a missing bind-mount source as root:root, and the container
  # runs as 999. The deploy user is unprivileged and cannot chown to another
  # uid, so hand ownership over with a throwaway root container instead.
  docker run --rm -u 0:0 -v "$1":/d alpine:3 chown -R 999:999 /d
}

ensure_dir "$DB_DATA" "database"
ensure_dir "$MINIO_DATA" "object storage"

PGV="$(read_pgversion "$DB_DATA")"
if [ -n "$PGV" ]; then
  if [ "$PGV" != "15" ]; then
    echo "❌ Cluster at $DB_DATA is Postgres $PGV, but the image ships 15."
    echo "   Refusing to deploy: a major-version mismatch will not start."
    exit 1
  fi
  echo "✅ Postgres $PGV cluster found at $DB_DATA"
elif [ "$ALLOW_BOOTSTRAP" = "no" ]; then
  echo "❌ No Postgres cluster at $DB_DATA (PG_VERSION unreadable by uid 999)."
  echo "   Refusing to deploy production: starting here would initialise an"
  echo "   EMPTY database and the site would come back with no gallery."
  echo "   Check 'docker volume ls' in case the data is in a named volume, then"
  echo "   set DB_DATA / MINIO_DATA in the environment to the real location."
  exit 1
else
  echo "ℹ️  No cluster yet — Postgres will initdb and db/init will seed the admin user."
fi

for D in "$DB_DATA" "$MINIO_DATA"; do
  if ! probe_writable "$D"; then
    echo "❌ $D is not writable by uid 999 (the container's user)."
    echo "   The old MinIO container ran as root, so its files usually need this once:"
    echo "   chown -R 999:999 $D"
    exit 1
  fi
done
echo "✅ Data directories writable by uid 999"

###############################################################################
# 4. Build first, then swap
#
# Building before `down` keeps the current stack serving for the whole npm ci /
# go build / apt install. The outage is the container swap, not the build, and
# a build failure aborts here (set -e) with the old site still up.
###############################################################################
echo "Building the image (the current stack keeps serving)..."
$COMPOSE build

echo "Swapping containers..."
$COMPOSE down --remove-orphans || true
$COMPOSE up -d --remove-orphans

###############################################################################
# 5. Wait on the container's own healthcheck, not a fixed sleep
###############################################################################
echo "Waiting for $CONTAINER to become healthy..."
i=0
while :; do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo starting)"
  if [ "$STATUS" = "healthy" ]; then
    echo "✅ Container healthy"
    break
  fi
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "❌ $CONTAINER did not become healthy in time (last status: $STATUS)"
    $COMPOSE logs --tail=120
    exit 1
  fi
  sleep 5
done

###############################################################################
# 6. Report
###############################################################################
GALLERY="$(docker exec "$CONTAINER" sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from gallery_items;"' \
  2>/dev/null || echo '?')"
echo "ℹ️  gallery_items rows: $GALLERY"

$COMPOSE ps

echo "🎉 $ENVIRONMENT deployment completed ($GIT_REF)"
