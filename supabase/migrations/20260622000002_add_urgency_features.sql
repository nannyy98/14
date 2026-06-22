-- Urgency & Scarcity: viewers tracking, cart pressure, limited offers

-- Active viewers tracking (who's viewing a product right now)
CREATE TABLE IF NOT EXISTS active_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  telegram_user_id BIGINT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_active_viewers_product ON active_viewers (product_id);
CREATE INDEX IF NOT EXISTS idx_active_viewers_cleanup ON active_viewers (viewed_at);

-- Limited time offers per product
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_per_customer INT;

-- RPC: record viewer (upsert with 5min TTL)
CREATE OR REPLACE FUNCTION record_product_viewer(
  p_product_id UUID,
  p_user_id BIGINT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO active_viewers (product_id, telegram_user_id, viewed_at)
  VALUES (p_product_id, p_user_id, now())
  ON CONFLICT (product_id, telegram_user_id)
  DO UPDATE SET viewed_at = now();
END;
$$ LANGUAGE plpgsql;

-- RPC: get active viewer count (last 10 minutes)
CREATE OR REPLACE FUNCTION get_active_viewer_count(p_product_id UUID)
RETURNS INT AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM active_viewers
  WHERE product_id = p_product_id
    AND viewed_at > now() - interval '10 minutes';
  RETURN COALESCE(cnt, 0);
END;
$$ LANGUAGE plpgsql;

-- RPC: get how many people have item in cart
CREATE OR REPLACE FUNCTION get_cart_pressure(p_product_id UUID)
RETURNS INT AS $$
DECLARE
  cnt INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT items FROM abandoned_carts
    WHERE created_at > now() - interval '24 hours'
      AND items IS NOT NULL
  LOOP
    FOR i IN 0..jsonb_array_length(rec.items::jsonb) - 1 LOOP
      IF (rec.items::jsonb->i->>'productId') = p_product_id::text THEN
        cnt := cnt + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql;

-- RPC: cleanup old viewers (run periodically)
CREATE OR REPLACE FUNCTION cleanup_viewers()
RETURNS VOID AS $$
BEGIN
  DELETE FROM active_viewers WHERE viewed_at < now() - interval '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE active_viewers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read viewers" ON active_viewers FOR SELECT USING (true);
CREATE POLICY "Service role manage viewers" ON active_viewers FOR ALL USING (true) WITH CHECK (true);
