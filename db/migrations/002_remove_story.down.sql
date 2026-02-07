-- Add story column back (rollback)
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS story TEXT;
