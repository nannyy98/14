import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function hashToken(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const body = await req.json();
    const { action, table, data, filters, id, sessionToken } = body;

    if (!action || !table) {
      return new Response(
        JSON.stringify({ error: "Missing action or table" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: session token required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenHash = await hashToken(sessionToken);

    const { data: admin, error: authError } = await supabase
      .from("admin_accounts")
      .select("id, role, is_active")
      .eq("session_token", tokenHash)
      .eq("is_active", true)
      .maybeSingle();

    if (authError || !admin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      case "select": {
        let query = supabase.from(table).select(data || "*");
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          }
        }
        if (table === "orders") {
          query = query.order("created_at", { ascending: false });
        } else if (table === "audit_log") {
          query = query.order("created_at", { ascending: false }).limit(100);
        }
        const { data: rows, error } = await query;
        if (error) throw error;
        result = rows;
        break;
      }

      case "insert": {
        if (!["super_admin", "admin", "manager", "seller", "content"].includes(admin.role)) {
          throw new Error("Insufficient permissions for insert");
        }
        const { data: inserted, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        result = inserted;
        break;
      }

      case "update": {
        if (!id) throw new Error("ID required for update");
        if (!["super_admin", "admin", "manager", "seller", "content"].includes(admin.role)) {
          throw new Error("Insufficient permissions for update");
        }
        const { data: updated, error } = await supabase
          .from(table)
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
        break;
      }

      case "delete": {
        if (!id) throw new Error("ID required for delete");
        if (!["super_admin", "admin"].includes(admin.role)) {
          throw new Error("Insufficient permissions for delete");
        }
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case "updateOrderStatus": {
        if (!id) throw new Error("ID required");
        if (!["super_admin", "admin", "manager", "support"].includes(admin.role)) {
          throw new Error("Insufficient permissions to update order status");
        }
        const { status, changed_by } = data;
        const { data: order, error: fetchErr } = await supabase
          .from("orders")
          .select("status_history")
          .eq("id", id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;

        const history = Array.isArray(order?.status_history) ? order.status_history : [];
        const newEntry = {
          status,
          changed_at: new Date().toISOString(),
          changed_by: changed_by || admin.id,
        };

        const { data: updatedOrder, error: updateErr } = await supabase
          .from("orders")
          .update({
            status,
            status_history: [...history, newEntry],
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        if (updateErr) throw updateErr;
        result = updatedOrder;

        await supabase.from("audit_log").insert({
          admin_id: admin.id,
          action: "update_order_status",
          entity_type: "orders",
          entity_id: id,
          details: { old_status: order?.status_history?.at?.(-1)?.status, new_status: status },
        });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Admin API error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
