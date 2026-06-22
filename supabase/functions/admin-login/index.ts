import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIp } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGINS = [
  "https://bvslgcrgqznlbufzkrly.supabase.co",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey",
    "Access-Control-Allow-Credentials": "true",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limit check
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(supabase, ip, "admin-login");
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfter || 900),
          } 
        }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the SQL function to verify password (handles bcrypt + plain text)
    const { data: result, error } = await supabase.rpc("verify_admin_password", {
      p_email: email.trim().toLowerCase(),
      p_password: password,
    }).maybeSingle();

    if (error || !result?.valid) {
      return new Response(
        JSON.stringify({ error: result?.error || "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const tokenHash = await hashToken(sessionToken);

    // Update session in DB
    await supabase
      .from("admin_accounts")
      .update({
        last_login_at: new Date().toISOString(),
        session_token: tokenHash,
      })
      .eq("id", result.id);

    // Log the login
    await supabase.from("audit_log").insert({
      admin_id: result.id,
      action: "login",
      entity_type: "admin_accounts",
      entity_id: result.id,
      details: { email: result.email },
    });

    return new Response(
      JSON.stringify({
        success: true,
        admin: {
          id: result.id,
          email: result.email,
          first_name: result.first_name,
          role: result.role,
        },
        sessionToken,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashToken(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
