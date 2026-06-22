-- Rate Limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON rate_limits (ip_address, endpoint, window_start);

-- Cleanup old entries (run periodically via pg_cron or Edge Function)
-- DELETE FROM rate_limits WHERE window_start < now() - interval '1 hour';

-- RLS: only service role can access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON rate_limits FOR ALL USING (true) WITH CHECK (true);
