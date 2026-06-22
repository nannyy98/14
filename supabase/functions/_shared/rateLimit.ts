import { createClient } from "npm:@supabase/supabase-js@2";

interface RateLimitConfig {
  maxRequests: number;
  windowMinutes: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  "admin-login": { maxRequests: 5, windowMinutes: 15 },
  "checkout": { maxRequests: 10, windowMinutes: 60 },
  "create-payment": { maxRequests: 5, windowMinutes: 15 },
  "admin-api": { maxRequests: 100, windowMinutes: 1 },
};

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  ip: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const rateConfig = config || DEFAULT_CONFIGS[endpoint] || { maxRequests: 30, windowMinutes: 1 };
  const windowStart = new Date(Date.now() - rateConfig.windowMinutes * 60 * 1000).toISOString();

  // Clean up old entries for this IP+endpoint
  await supabase
    .from("rate_limits")
    .delete()
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .lt("window_start", windowStart);

  // Count requests in current window
  const { data, error } = await supabase
    .from("rate_limits")
    .select("id")
    .eq("ip_address", ip)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart);

  if (error) {
    // If table doesn't exist yet, allow the request
    console.warn("Rate limit check failed:", error.message);
    return { allowed: true };
  }

  const currentCount = data?.length ?? 0;

  if (currentCount >= rateConfig.maxRequests) {
    const retryAfter = rateConfig.windowMinutes * 60;
    return { allowed: false, retryAfter };
  }

  // Record this request
  await supabase.from("rate_limits").insert({
    ip_address: ip,
    endpoint: endpoint,
  });

  return { allowed: true };
}

export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}
