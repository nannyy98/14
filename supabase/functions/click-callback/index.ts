import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_string } = body;

    if (!merchant_trans_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const merchantId = Deno.env.get("CLICK_MERCHANT_ID") ?? "";
    const secretKey = Deno.env.get("CLICK_SECRET_KEY") ?? "";

    if (secretKey) {
      const crypto = await import("https://deno.land/std@0.177.0/crypto/mod.ts");
      const encoder = new TextEncoder();
      const dataToSign = `${click_trans_id}${service_id}${merchantId}${merchant_trans_id}${amount}${action}${secretKey}`;
      const hashBuffer = await crypto.subtle.digest("md5", encoder.encode(dataToSign));
      const signHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signHash !== sign_string) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const orderId = merchant_trans_id;
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, status, transaction_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found", state: -1 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 0) {
      if (order.status === "paid" || order.status === "cancelled") {
        return new Response(
          JSON.stringify({ error: "Order already processed", state: -1 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("orders")
        .update({
          transaction_id: click_trans_id?.toString() || `click_${orderId}`,
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabase.from("audit_log").insert({
        admin_id: "system",
        action: "payment_callback",
        entity_type: "orders",
        entity_id: orderId,
        details: { provider: "click", action: "create", click_trans_id },
      });

      return new Response(
        JSON.stringify({ state: 0, click_trans_id, merchant_trans_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 1) {
      return new Response(
        JSON.stringify({ state: 0, click_trans_id, merchant_trans_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === -1) {
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ state: 0, click_trans_id, merchant_trans_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ state: 0, click_trans_id, merchant_trans_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Click callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", state: -1 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
