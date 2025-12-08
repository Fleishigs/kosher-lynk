-- Additional upgrades for multiple categories, images, and SEO

-- 1. Add SEO fields to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_keywords text;

-- 2. Add multiple images support (array of image URLs)
ALTER TABLE products ADD COLUMN IF NOT EXISTS images text[];

-- 3. Update category_id to category_ids (array) for multiple categories
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_ids bigint[];

-- 4. Add product status
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 5. Add slug for SEO-friendly URLs
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug text;

-- Done! Now you can have:
-- - Multiple categories per product (category_ids)
-- - Multiple images per product (images array)
-- - SEO optimization (seo_title, seo_description, seo_keywords, slug)
-- - Product status (active/draft/archived)
