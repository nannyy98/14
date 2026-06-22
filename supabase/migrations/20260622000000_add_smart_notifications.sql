-- Smart Notification Subscriptions
-- Users subscribe to price drops, back-in-stock, etc.

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  product_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('price_drop', 'back_in_stock', 'low_stock')),
  target_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(telegram_user_id, product_id, type)
);

-- Price history for tracking drops
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notif_sub_user ON notification_subscriptions (telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_notif_sub_product ON notification_subscriptions (product_id);
CREATE INDEX IF NOT EXISTS idx_notif_sub_active ON notification_subscriptions (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history (product_id, changed_at DESC);

-- RLS
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscriptions" ON notification_subscriptions FOR SELECT USING (true);
CREATE POLICY "Users manage own subscriptions" ON notification_subscriptions FOR ALL USING (true);
CREATE POLICY "Service role price_history" ON price_history FOR ALL USING (true) WITH CHECK (true);

-- Trigger: record price changes
CREATE OR REPLACE FUNCTION record_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_history (product_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_change ON products;
CREATE TRIGGER trg_price_change
  AFTER UPDATE OF price ON products
  FOR EACH ROW
  EXECUTE FUNCTION record_price_change();

-- RPC: subscribe to notifications
CREATE OR REPLACE FUNCTION subscribe_notification(
  p_user_id BIGINT,
  p_product_id UUID,
  p_type TEXT,
  p_target_price NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notification_subscriptions (telegram_user_id, product_id, type, target_price)
  VALUES (p_user_id, p_product_id, p_type, p_target_price)
  ON CONFLICT (telegram_user_id, product_id, type) DO UPDATE
    SET is_active = true, target_price = COALESCE(p_target_price, notification_subscriptions.target_price);
END;
$$ LANGUAGE plpgsql;

-- RPC: unsubscribe
CREATE OR REPLACE FUNCTION unsubscribe_notification(
  p_user_id BIGINT,
  p_product_id UUID,
  p_type TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_subscriptions
  SET is_active = false
  WHERE telegram_user_id = p_user_id AND product_id = p_product_id AND type = p_type;
END;
$$ LANGUAGE plpgsql;

-- RPC: get user subscriptions for a product
CREATE OR REPLACE FUNCTION get_user_subscriptions(
  p_user_id BIGINT,
  p_product_id UUID
)
RETURNS TABLE (type TEXT, is_active BOOLEAN, target_price NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT ns.type, ns.is_active, ns.target_price
  FROM notification_subscriptions ns
  WHERE ns.telegram_user_id = p_user_id AND ns.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: get all active subscriptions for a product (for triggering notifications)
CREATE OR REPLACE FUNCTION get_active_subscriptions(p_product_id UUID)
RETURNS TABLE (telegram_user_id BIGINT, type TEXT, target_price NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT ns.telegram_user_id, ns.type, ns.target_price
  FROM notification_subscriptions ns
  WHERE ns.product_id = p_product_id AND ns.is_active = true;
END;
$$ LANGUAGE plpgsql;
