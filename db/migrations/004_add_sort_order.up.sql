-- Add sort_order column to gallery_items for admin-controlled gallery ordering
ALTER TABLE gallery_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing insertion order (created_at ascending)
UPDATE gallery_items SET sort_order = subquery.row_num
FROM (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1) AS row_num
  FROM gallery_items
) AS subquery
WHERE gallery_items.id = subquery.id;
