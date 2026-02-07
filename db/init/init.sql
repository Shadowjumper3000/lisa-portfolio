-- init.sql: create tables and seed an admin user

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

-- seed admin (username: admin, password: password)
INSERT INTO admin_users (username, password)
VALUES ('admin', 'password')
ON CONFLICT (username) DO NOTHING;

