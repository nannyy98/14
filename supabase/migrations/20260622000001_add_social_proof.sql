-- Social Proof: bought today, trending, ratings on products

-- Function to count items bought in last 24h for a product
CREATE OR REPLACE FUNCTION get_bought_today(p_product_id UUID)
RETURNS INT AS $$
DECLARE
  total INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT items FROM orders
    WHERE created_at >= now() - interval '24 hours'
      AND status NOT IN ('cancelled')
  LOOP
    IF rec.items IS NOT NULL THEN
      FOR i IN 0..jsonb_array_length(rec.items::jsonb) - 1 LOOP
        IF (rec.items::jsonb->i->>'productId') = p_product_id::text THEN
          total := total + COALESCE((rec.items::jsonb->i->>'quantity')::int, 1);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to get social proof stats for multiple products at once
CREATE OR REPLACE FUNCTION get_social_proof(p_product_ids UUID[])
RETURNS TABLE (
  product_id UUID,
  bought_today INT,
  total_bought INT,
  avg_rating NUMERIC,
  review_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH product_orders AS (
    SELECT
      o.items,
      o.created_at
    FROM orders o
    WHERE o.created_at >= now() - interval '30 days'
      AND o.status NOT IN ('cancelled')
  ),
  bought_counts AS (
    SELECT
      (item->>'productId')::uuid AS pid,
      SUM(COALESCE((item->>'quantity')::int, 1)) AS total,
      SUM(CASE WHEN po.created_at >= now() - interval '24 hours'
        THEN COALESCE((item->>'quantity')::int, 1) ELSE 0 END) AS today
    FROM product_orders po,
         jsonb_array_elements(po.items::jsonb) AS item
    WHERE (item->>'productId')::uuid = ANY(p_product_ids)
    GROUP BY (item->>'productId')::uuid
  ),
  rating_data AS (
    SELECT
      r.product_id AS pid,
      AVG(r.rating)::numeric(3,2) AS avg_r,
      COUNT(*)::bigint AS cnt
    FROM reviews r
    WHERE r.product_id = ANY(p_product_ids)
      AND r.is_approved = true
    GROUP BY r.product_id
  )
  SELECT
    unnest(p_product_ids) AS product_id,
    COALESCE(bc.today, 0)::int AS bought_today,
    COALESCE(bc.total, 0)::int AS total_bought,
    COALESCE(rd.avg_r, 0)::numeric AS avg_rating,
    COALESCE(rd.cnt, 0)::bigint AS review_count
  FROM unnest(p_product_ids) pid
  LEFT JOIN bought_counts bc ON bc.pid = pid
  LEFT JOIN rating_data rd ON rd.pid = pid;
END;
$$ LANGUAGE plpgsql;
