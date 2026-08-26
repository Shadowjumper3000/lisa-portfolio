-- Initial schema migration
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

-- NOTE: this migration used to seed a hardcoded `admin` / `password` account.
-- The conflict target is `username`, so on any database whose real admin was
-- seeded under a different name that INSERT did not conflict — it created a
-- SECOND account with a known plaintext password. The admin user is seeded by
-- db/init/01-init.sh from ADMIN_USERNAME / ADMIN_PASSWORD instead.
