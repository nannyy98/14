-- Full-Text Search for products
-- Adds tsvector columns and GIN indexes for fast search

-- Add tsvector columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector_ru tsvector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector_uz tsvector;

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_ru ON products USING GIN (search_vector_ru);
CREATE INDEX IF NOT EXISTS idx_products_search_uz ON products USING GIN (search_vector_uz);

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_product_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector_ru := 
    setweight(to_tsvector('russian', COALESCE(NEW.name->>'ru', '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(NEW.description->>'ru', '')), 'B');
  
  NEW.search_vector_uz := 
    setweight(to_tsvector('simple', COALESCE(NEW.name->>'uz', '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description->>'uz', '')), 'B');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_product_search ON products;
CREATE TRIGGER trg_update_product_search
  BEFORE INSERT OR UPDATE OF name, description ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vectors();

-- Populate existing data
UPDATE products SET 
  search_vector_ru = 
    setweight(to_tsvector('russian', COALESCE(name->>'ru', '')), 'A') ||
    setweight(to_tsvector('russian', COALESCE(description->>'ru', '')), 'B'),
  search_vector_uz = 
    setweight(to_tsvector('simple', COALESCE(name->>'uz', '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(description->>'uz', '')), 'B')
WHERE search_vector_ru IS NULL OR search_vector_uz IS NULL;

-- RPC function for full-text search with ranking
CREATE OR REPLACE FUNCTION search_products(
  p_query TEXT,
  p_language TEXT DEFAULT 'ru',
  p_category_id TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_in_stock BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name JSONB,
  slug TEXT,
  price NUMERIC,
  description JSONB,
  category_id TEXT,
  images TEXT[],
  sizes TEXT[],
  colors JSONB,
  specs JSONB,
  stock INT,
  is_active BOOLEAN,
  views INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL,
  total_count BIGINT
) AS $$
DECLARE
  v_tsquery TSQUERY;
  v_search_vector TSVECTOR;
BEGIN
  -- Build tsquery from user input
  -- Replace spaces with & for AND matching
  p_query := trim(p_query);
  IF p_language = 'uz' THEN
    v_tsquery := plainto_tsquery('simple', p_query);
  ELSE
    v_tsquery := plainto_tsquery('russian', p_query);
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT 
      p.*,
      CASE 
        WHEN p_language = 'uz' THEN ts_rank(p.search_vector_uz, v_tsquery)
        ELSE ts_rank(p.search_vector_ru, v_tsquery)
      END AS product_rank
    FROM products p
    WHERE p.is_active = true
      AND (
        CASE 
          WHEN p_language = 'uz' THEN p.search_vector_uz @@ v_tsquery
          ELSE p.search_vector_ru @@ v_tsquery
        END
      )
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_min_price IS NULL OR p.price >= p_min_price)
      AND (p_max_price IS NULL OR p.price <= p_max_price)
      AND (NOT p_in_stock OR p.stock > 0)
  ),
  counted AS (
    SELECT *, COUNT(*) OVER() AS cnt FROM filtered
  )
  SELECT 
    c.id, c.name, c.slug, c.price, c.description, c.category_id,
    c.images, c.sizes, c.colors, c.specs, c.stock, c.is_active,
    c.views, c.created_at, c.updated_at,
    c.product_rank AS rank,
    c.cnt AS total_count
  FROM counted c
  ORDER BY c.product_rank DESC, c.views DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Popular search terms (for autocomplete suggestions)
CREATE OR REPLACE FUNCTION get_popular_searches(p_limit INT DEFAULT 8)
RETURNS TABLE (term TEXT, search_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(string_to_array(lower(title_ru), ' ')) AS term,
    COUNT(*) AS search_count
  FROM products
  WHERE is_active = true
  GROUP BY term
  HAVING length(term) > 2
  ORDER BY search_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
