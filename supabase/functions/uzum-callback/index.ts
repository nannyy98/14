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
    const { order_id, transaction_id, status, amount, paid_at } = body;

    if (!order_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.status === "paid" || order.status === "cancelled") {
      return new Response(
        JSON.stringify({ message: "Order already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "paid") {
      await supabase
        .from("orders")
        .update({
          transaction_id: transaction_id || `uzum_${order_id}`,
          status: "paid",
          paid_at: paid_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      await supabase.from("audit_log").insert({
        admin_id: "system",
        action: "payment_callback",
        entity_type: "orders",
        entity_id: order_id,
        details: { provider: "uzum", transaction_id, amount },
      });
    } else if (status === "cancelled") {
      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Uzum callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
