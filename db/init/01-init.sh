#!/bin/bash
# Runs ONLY on a first-time initdb, i.e. when PGDATA is empty. Production's
# cluster has been initialised for a long time, so this never executes there —
# it exists for a fresh staging bootstrap and for local development.
#
# This replaced an init.sql that had the admin credentials `sed`-substituted
# into it by the deploy workflow. That broke on any password containing a sed
# metacharacter and put the secret in a file on disk; psql's `-v` binding below
# quotes the values properly and takes them straight from the container env.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
	CREATE TABLE IF NOT EXISTS admin_users (
	  id SERIAL PRIMARY KEY,
	  username TEXT UNIQUE NOT NULL,
	  password TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS gallery_items (
	  id SERIAL PRIMARY KEY,
	  title TEXT NOT NULL,
	  info TEXT,
	  year_created INTEGER,
	  description TEXT,
	  image_path TEXT,
	  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
	);

	CREATE TABLE IF NOT EXISTS site_settings (
	  id INTEGER PRIMARY KEY DEFAULT 1,
	  hero_image_id INTEGER,
	  about_image_id INTEGER,
	  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	  CONSTRAINT single_row CHECK (id = 1)
	);
EOSQL

: "${ADMIN_USERNAME:?ADMIN_USERNAME must be set to seed the admin user}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set to seed the admin user}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v username="$ADMIN_USERNAME" -v password="$ADMIN_PASSWORD" <<-'EOSQL'
	INSERT INTO admin_users (username, password)
	VALUES (:'username', :'password')
	ON CONFLICT (username) DO NOTHING;
EOSQL

echo "db/init: seeded admin user '${ADMIN_USERNAME}'"
