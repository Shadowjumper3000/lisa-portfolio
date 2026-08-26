lisa-portfolio
================

Monorepo: React frontend, Go backend with JWT auth, Postgres DB, MinIO object
storage — all running in **one container**.

Architecture
------------

A single image (`deploy/Dockerfile`) runs four processes under `supervisord`:

| Process  | Port (in-container) | Reachable from outside? |
|----------|---------------------|-------------------------|
| nginx (prod) / Vite (dev) | `0.0.0.0:8080` | yes — the only exposed port |
| Go API   | `127.0.0.1:8090`    | no |
| Postgres | `127.0.0.1:5432`    | no |
| MinIO    | `127.0.0.1:9000/9001` | no |

**Nothing runs as root.** Every process is uid/gid 999. That specific uid is not
arbitrary: it is the `postgres` user that already owns the live cluster in
`data/db`, so the existing database attaches with no `chown` and therefore no
risk to existing data. (MinIO is the exception — it used to run as root, so
`data/minio` needs a one-time `chown`; see the migration section below.) The container also runs with
`cap_drop: ALL` and `no-new-privileges`.

Because an unprivileged process cannot bind a port below 1024, the web tier
listens on **8080, not 80**.

Development
-----------

```bash
docker compose -f deploy/docker-compose.dev.yml up --build
```

Everything (Vite, Go API, Postgres, MinIO) runs in the one `portfolio-lisa`
container. All dev ports publish to host loopback only:

- App (Vite, proxies `/api` itself): http://127.0.0.1:8080
- Postgres: `127.0.0.1:5432`
- MinIO API / console: `127.0.0.1:9000` / `127.0.0.1:9001`

Dev uses its own volumes (`portfolio-lisa-dev-db-data`,
`portfolio-lisa-dev-minio-data`) so it can never attach the production database.

Logs from all four processes are interleaved on `docker compose logs`. To act on
one process:

```bash
docker exec portfolio-lisa supervisorctl -c /etc/supervisor/supervisord.conf status
docker exec portfolio-lisa supervisorctl -c /etc/supervisor/supervisord.conf restart api
```

Production
----------

```bash
docker compose -f deploy/docker-compose.prod.yml up --build -d
```

Production has **no default secrets**. `DB_PASSWORD`, `JWT_SECRET` and
`MINIO_ROOT_PASSWORD` must be set or compose fails fast, rather than silently
shipping `minioadmin` / a dev JWT secret to the internet.

Migrating the existing 4-container deployment
---------------------------------------------

Data lives in **host bind mounts** under the deploy directory, not in named
volumes: `$DEPLOY_DIR/data/db` and `$DEPLOY_DIR/data/minio` (since b98d020,
2026-02-19). The `portfolio-lisa-db-data` / `portfolio-lisa-minio-data` named
volumes are stale leftovers from before that commit — do not migrate them.
Confirm the real location by asking the running containers:

```bash
docker inspect portfolio-lisa-db portfolio-lisa-minio \
  --format '{{.Name}}:{{range .Mounts}} {{.Source}} -> {{.Destination}}{{end}}'
```

Both directories are reused as-is — no dump/restore. Four things must happen
**before** the first single-container deploy.

**0. Confirm migrations are already applied.** `db/migrations/003_clear_orphaned_images.up.sql`
is a `TRUNCATE TABLE gallery_items`. It is guarded by `schema_migrations`, so on
a live database that already ran it, it never runs again — but if that table were
missing or behind, the next API start would wipe the gallery. Check it against
the **currently running** stack before taking it down:

```bash
# Reads the credentials from the old db container's own environment, so this
# works whether or not the change has been pulled onto the host yet.
docker exec portfolio-lisa-db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select version, dirty from schema_migrations;"'
```

Expect `4|f`. Anything else (no such table, a lower version, or `dirty = t`) means
stop and resolve it first — this is a pre-existing hazard in the migration set,
unrelated to the container merge. Record the gallery count too, to compare after
cutover:

```bash
docker exec portfolio-lisa-db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "select count(*) from gallery_items;"'
```

**1. Take a backup.** A logical dump is the rollback that does not depend on
file ownership being right:

```bash
docker exec portfolio-lisa-db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > ~/backups/portfolio-$(date +%F).sql
tar czf ~/backups/minio-$(date +%F).tgz -C "$DEPLOY_DIR/data/minio" .
```

**2. Fix MinIO ownership (one time).** The old MinIO container ran as root, so
its files are root-owned and uid 999 cannot write them. Postgres needs no such
fix — it was already uid 999.

```bash
chown -R 999:999 "$DEPLOY_DIR/data/minio"

# Verify exactly the way the deploy pre-flight does:
docker run --rm -u 999:999 -v "$DEPLOY_DIR/data/minio":/probe alpine:3 \
  sh -c 'touch /probe/.p && rm /probe/.p && echo "minio: ok"'
docker run --rm -u 999:999 -v "$DEPLOY_DIR/data/db":/probe alpine:3 \
  sh -c 'cat /probe/PG_VERSION && touch /probe/.p && rm /probe/.p && echo "db: ok"'
```

Expect `minio: ok`, then `15` and `db: ok`. The deploy workflow runs the same
probes before it stops anything, so a forgotten `chown` fails the deploy with the
old site still serving rather than leaving it down.

**3. Update the reverse proxy upstream port.** The container keeps the network
alias `portfolio-lisa-web` on the `proxy` network, so the hostname is unchanged,
but the port moves from **80 to 8080**:

```
portfolio-lisa-web:80   ->   portfolio-lisa-web:8080
```

With Nginx Proxy Manager this is a manual edit — it renders its nginx configs
from its own database and does not auto-detect container ports. Change it in the
UI (Hosts → Proxy Hosts → Edit → Forward Port), not in `/data/nginx/proxy_host/`,
which NPM overwrites. Do it while the deploy is building, so the new container
comes up into a proxy that already points at 8080.

Structure
---------
- `app/` Go backend
- `web/` React frontend (`nginx.conf` is the production web tier config)
- `db/` DB init SQL and migrations
- `deploy/` Dockerfile, compose files, and `rootfs/` (supervisord configs + API start gate)

Continuous deploy (Hetzner)
---------------------------

| Trigger | Environment | Directory on the host | Proxy alias |
|---|---|---|---|
| push to `main` | staging | `~/portfolio-lisa-staging` | `portfolio-lisa-staging-web:8080` |
| push tag `v*` | production | `~/portfolio-lisa` | `portfolio-lisa-web:8080` |
| `workflow_dispatch` | either | as above | as above |

Every merge to `main` redeploys staging automatically. **Production only ever
deploys from a release tag** — the workflow refuses a branch ref for production
on every trigger path, including manual dispatch. Cutting a release is:

```bash
git tag -a v1.4.0 -m "..." && git push origin v1.4.0
```

Rolling back is the same move at an older tag, via **Actions → Deploy → Run
workflow → environment: production, ref: v1.3.0**. The server checks the tag out
detached, so what is running is always exactly a tag.

`.github/workflows/deploy.yml` only resolves the target and moves secrets; the
work happens in **`deploy/deploy.sh`**, which runs on the host (piped in over
ssh). Both environments share that one implementation — the environment name is
its only input, and the deploy directory, compose file, project name and
container name are all derived from it. Nothing about *which data gets touched*
travels over the wire, so a bad workflow input cannot aim a staging deploy at
production data.

Secrets go over ssh stdin into `$HOME/.portfolio-lisa-<env>.env`, never through
argv or the remote environment (they would be visible in the process list), and
a `trap` removes them however the script exits.

Required GitHub Secrets:

- `HETZNER_HOST`, `HETZNER_USER`, `HETZNER_SSH_KEY` — SSH access
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — seeded on a first-time initdb only
- `SERVER_NAME`, `VITE_*` — frontend build args

Staging reuses all of the above. Any `STAGING_`-prefixed variant (e.g.
`STAGING_JWT_SECRET`) overrides its shared counterpart for staging only, so the
two environments can be separated later by adding secrets — no workflow change.
Until then, be aware that **a staging compromise yields production credentials**:
same JWT signing secret, same database password, same MinIO root user.

### Staging bootstraps, production never does

The pre-flight checks are the same for both environments except in one respect.
Production **refuses to start without an already-initialised Postgres 15
cluster** — a wrong path aborts the deploy instead of silently `initdb`-ing an
empty one and serving a blank site. Staging is allowed to create its data
directories and initialise from scratch, which is what happens on its very first
deploy: `db/init/01-init.sh` seeds the admin user, then the API runs migrations.

Because Docker would create a missing bind-mount source as `root:root` and the
container runs as uid 999, `deploy.sh` creates those directories and hands them
over via a throwaway root container — the deploy user is unprivileged and cannot
`chown` to another uid.

### First staging deploy

The stack comes up on its own; the only manual step is one Proxy Host in Nginx
Proxy Manager pointing your staging subdomain at:

```
portfolio-lisa-staging-web:8080
```

Everything else — data directories, ownership, database, admin user — is created
by the deploy.

Known issue (pre-existing, not addressed here)
----------------------------------------------

Admin passwords are stored and compared in **plaintext**
(`app/handlers.go`: `stored != req.Password`, seeded by `db/init/01-init.sh`).
Fixing this needs a bcrypt migration plus a change to the seeding flow, which is
a separate piece of work from the container consolidation.
