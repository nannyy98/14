-- Server-side cart sync
CREATE TABLE IF NOT EXISTS user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own cart" ON user_carts FOR SELECT USING (true);
CREATE POLICY "Users manage own cart" ON user_carts FOR ALL USING (true);

-- RPC: upsert cart
CREATE OR REPLACE FUNCTION upsert_cart(
  p_user_id BIGINT,
  p_items JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_carts (telegram_user_id, items, updated_at)
  VALUES (p_user_id, p_items, now())
  ON CONFLICT (telegram_user_id)
  DO UPDATE SET items = p_items, updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- RPC: get cart
CREATE OR REPLACE FUNCTION get_user_cart(p_user_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  cart_items JSONB;
BEGIN
  SELECT items INTO cart_items
  FROM user_carts
  WHERE telegram_user_id = p_user_id;
  RETURN COALESCE(cart_items, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;
