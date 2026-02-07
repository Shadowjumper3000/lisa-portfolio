-- Clear gallery items when setting up fresh volumes
-- This prevents 404 errors for images that don't exist in new MinIO instance
-- Only runs once when migration is first applied
TRUNCATE TABLE gallery_items;

-- Also clear site settings to avoid referencing non-existent images
UPDATE site_settings SET hero_image_id = NULL, about_image_id = NULL WHERE id = 1;
