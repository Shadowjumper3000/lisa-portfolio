lisa-portfolio
================

Monorepo scaffold: React frontend, Go backend with JWT auth, Postgres DB, Dockerized dev and prod.

Development
-----------

Start services locally (dev compose uses bind mounts):

```bash
docker compose -f deploy/docker-compose.dev.yml up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8080

Production
----------

Build images and run:

```bash
docker compose -f deploy/docker-compose.prod.yml up --build -d
```

Structure
---------
- `app/` Go backend
- `web/` React frontend
- `db/` DB init SQL
- `deploy/` docker-compose dev/prod
- `config/` example env/config
 
Continuous deploy (Hetzner)
---------------------------

This repo includes a GitHub Actions workflow at `.github/workflows/deploy.yml` that SSHes into your Hetzner host and deploys the repo. To use it, add these GitHub Secrets to the repository settings:

- `HETZNER_HOST` — IP or hostname of your Hetzner server
- `HETZNER_USER` — SSH username (e.g., `root`)
- `HETZNER_SSH_KEY` — private SSH key (PEM) for that user
- `REPO_URL` — git clone URL for this repo (e.g., git@github.com:you/repo.git)
- `PROJECT_DIR` — path on the server to deploy into (e.g., `/srv/lisa-portfolio`)
- `PROD_ENV` — (optional) entire `.env` contents for production; the workflow writes this to `${PROJECT_DIR}/.env` on the server

The workflow will `mkdir -p` the project dir, clone or pull the repo, write `.env` from `PROD_ENV`, then run:

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

Ensure the server has Docker and Docker Compose installed and that the SSH key has proper access.