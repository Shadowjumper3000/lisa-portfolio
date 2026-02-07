-- Remove story column from gallery_items if it exists
ALTER TABLE gallery_items DROP COLUMN IF EXISTS story;
