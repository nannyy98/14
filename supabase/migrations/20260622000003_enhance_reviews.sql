-- Enhanced Reviews: photos, helpful votes, rating breakdown

-- Add photo support to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'Аноним';

-- Review helpful votes
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  is_helpful BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, telegram_user_id)
);

-- Review reports
CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  telegram_user_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes (review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id, created_at DESC);

-- RLS
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read votes" ON review_votes FOR SELECT USING (true);
CREATE POLICY "Users vote" ON review_votes FOR ALL USING (true);
CREATE POLICY "Users report" ON review_reports FOR ALL USING (true);

-- RPC: get rating breakdown
CREATE OR REPLACE FUNCTION get_rating_breakdown(p_product_id UUID)
RETURNS TABLE (stars INT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.stars,
    COALESCE(COUNT(r.id), 0)::bigint AS count
  FROM generate_series(1, 5) AS gs(stars)
  LEFT JOIN reviews r ON r.product_id = p_product_id
    AND r.is_approved = true
    AND r.rating = gs.stars
  GROUP BY gs.stars
  ORDER BY gs.stars DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC: vote on review
CREATE OR REPLACE FUNCTION vote_review(
  p_review_id UUID,
  p_user_id BIGINT,
  p_helpful BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO review_votes (review_id, telegram_user_id, is_helpful)
  VALUES (p_review_id, p_user_id, p_helpful)
  ON CONFLICT (review_id, telegram_user_id)
  DO UPDATE SET is_helpful = p_helpful;
END;
$$ LANGUAGE plpgsql;

-- RPC: get helpful count for review
CREATE OR REPLACE FUNCTION get_helpful_count(p_review_id UUID)
RETURNS INT AS $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM review_votes
  WHERE review_id = p_review_id AND is_helpful = true;
  RETURN COALESCE(cnt, 0);
END;
$$ LANGUAGE plpgsql;

-- RPC: check if user voted
CREATE OR REPLACE FUNCTION has_user_voted(p_review_id UUID, p_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  voted BOOLEAN;
BEGIN
  SELECT is_helpful INTO voted
  FROM review_votes
  WHERE review_id = p_review_id AND telegram_user_id = p_user_id
  LIMIT 1;
  RETURN COALESCE(voted, NULL);
END;
$$ LANGUAGE plpgsql;

-- RPC: get reviews with votes
CREATE OR REPLACE FUNCTION get_reviews_with_votes(
  p_product_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_sort TEXT DEFAULT 'newest'
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  telegram_user_id BIGINT,
  rating INT,
  text TEXT,
  user_name TEXT,
  photos TEXT[],
  is_approved BOOLEAN,
  is_verified_purchase BOOLEAN,
  created_at TIMESTAMPTZ,
  helpful_count BIGINT,
  user_vote BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.product_id,
    r.telegram_user_id,
    r.rating,
    r.text,
    r.user_name,
    r.photos,
    r.is_approved,
    r.is_verified_purchase,
    r.created_at,
    COALESCE(hc.cnt, 0)::bigint AS helpful_count,
    NULL::boolean AS user_vote
  FROM reviews r
  LEFT JOIN (
    SELECT review_id, COUNT(*) FILTER (WHERE is_helpful = true) AS cnt
    FROM review_votes
    GROUP BY review_id
  ) hc ON hc.review_id = r.id
  WHERE r.product_id = p_product_id
    AND r.is_approved = true
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN r.created_at END DESC,
    CASE WHEN p_sort = 'highest' THEN r.rating END DESC,
    CASE WHEN p_sort = 'helpful' THEN COALESCE(hc.cnt, 0) END DESC,
    r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
