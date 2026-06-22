-- Price Rules table
CREATE TABLE IF NOT EXISTS price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL,
  name_uz TEXT NOT NULL,
  description_ru TEXT,
  description_uz TEXT,
  type TEXT NOT NULL CHECK (type IN ('volume', 'time', 'tier')),
  conditions JSONB NOT NULL DEFAULT '{}',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active rules" ON price_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Service role full access" ON price_rules FOR ALL USING (true) WITH CHECK (true);

-- RPC to calculate applicable discount for a cart
CREATE OR REPLACE FUNCTION calculate_cart_discount(
  p_total_amount NUMERIC,
  p_items_count INT,
  p_user_role TEXT DEFAULT 'customer',
  p_current_time TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id AS rule_id,
    COALESCE(pr.name_ru, pr.name_uz) AS rule_name,
    pr.discount_type,
    pr.discount_value,
    CASE 
      WHEN pr.discount_type = 'percent' THEN ROUND(p_total_amount * pr.discount_value / 100)
      ELSE LEAST(pr.discount_value, p_total_amount)
    END AS discount_amount
  FROM price_rules pr
  WHERE pr.is_active = true
    AND (
      (pr.type = 'volume' AND (pr.conditions->>'min_quantity')::INT <= p_items_count)
      OR (pr.type = 'time' 
        AND p_current_time >= (pr.conditions->>'start_time')::TIMESTAMPTZ
        AND p_current_time <= (pr.conditions->>'end_time')::TIMESTAMPTZ)
      OR (pr.type = 'tier' AND pr.conditions->'allowed_roles' ? p_user_role)
    )
  ORDER BY pr.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Seed some price rules
INSERT INTO price_rules (name_ru, name_uz, type, conditions, discount_type, discount_value, priority) VALUES
(
  'Скидка за 3+ товара',
  '3+ mahsulot uchun chegirma',
  'volume',
  '{"min_quantity": 3}',
  'percent',
  5,
  10
),
(
  'Скидка за 5+ товаров',
  '5+ mahsulot uchun chegirma',
  'volume',
  '{"min_quantity": 5}',
  'percent',
  10,
  20
),
(
  'Скидка за 10+ товаров',
  '10+ mahsulot uchun chegirma',
  'volume',
  '{"min_quantity": 10}',
  'percent',
  15,
  30
)
ON CONFLICT DO NOTHING;
