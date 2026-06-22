import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Apikey",
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

    const botToken = Deno.env.get("BOT_TOKEN") ?? "";
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "BOT_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { type } = body;

    let notificationsSent = 0;

    // 1. Price Drop Notifications
    if (!type || type === "price_drop") {
      const { data: recentChanges } = await supabase
        .from("price_history")
        .select("product_id, old_price, new_price, changed_at")
        .gte("changed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("changed_at", { ascending: false });

      if (recentChanges) {
        for (const change of recentChanges) {
          if (change.new_price >= change.old_price) continue;

          const { data: subs } = await supabase
            .from("notification_subscriptions")
            .select("telegram_user_id, target_price")
            .eq("product_id", change.product_id)
            .eq("type", "price_drop")
            .eq("is_active", true);

          if (!subs) continue;

          for (const sub of subs) {
            if (sub.target_price && change.new_price > sub.target_price) continue;

            const { data: product } = await supabase
              .from("products")
              .select("name, slug, price, images")
              .eq("id", change.product_id)
              .maybeSingle();

            if (!product) continue;

            const name = product.name?.ru || product.name?.uz || "Товар";
            const discount = Math.round((1 - change.new_price / change.old_price) * 100);
            const text = `🔔 *Цена упала!*\n\n` +
              `${name}\n` +
              `~~${formatPrice(change.old_price)}~~ → *${formatPrice(change.new_price)}*\n` +
              `(-${discount}%)\n\n` +
              `Открыть: https://t.me/${Deno.env.get("BOT_USERNAME") ?? "your_bot"}?startapp=product_${product.slug}`;

            await sendTelegramMessage(botToken, sub.telegram_user_id, text);
            notificationsSent++;
          }
        }
      }
    }

    // 2. Back in Stock Notifications
    if (!type || type === "back_in_stock") {
      const { data: restockedProducts } = await supabase
        .from("products")
        .select("id, name, slug, stock")
        .gt("stock", 0)
        .eq("is_active", true);

      if (restockedProducts) {
        for (const product of restockedProducts) {
          const { data: subs } = await supabase
            .from("notification_subscriptions")
            .select("telegram_user_id")
            .eq("product_id", product.id)
            .eq("type", "back_in_stock")
            .eq("is_active", true)
            .is("notified_at", null);

          if (!subs || subs.length === 0) continue;

          const name = product.name?.ru || product.name?.uz || "Товар";

          for (const sub of subs) {
            const text = `✅ *Товар снова в наличии!*\n\n` +
              `${name}\n` +
              `Осталось: ${product.stock} шт.\n\n` +
              `Открыть: https://t.me/${Deno.env.get("BOT_USERNAME") ?? "your_bot"}?startapp=product_${product.slug}`;

            await sendTelegramMessage(botToken, sub.telegram_user_id, text);
            notificationsSent++;

            await supabase
              .from("notification_subscriptions")
              .update({ notified_at: new Date().toISOString() })
              .eq("product_id", product.id)
              .eq("type", "back_in_stock")
              .eq("telegram_user_id", sub.telegram_user_id);
          }
        }
      }
    }

    // 3. Low Stock Notifications (<=3 items)
    if (!type || type === "low_stock") {
      const { data: lowStockProducts } = await supabase
        .from("products")
        .select("id, name, slug, stock")
        .gt("stock", 0)
        .lte("stock", 3)
        .eq("is_active", true);

      if (lowStockProducts) {
        for (const product of lowStockProducts) {
          const { data: subs } = await supabase
            .from("notification_subscriptions")
            .select("telegram_user_id")
            .eq("product_id", product.id)
            .eq("type", "low_stock")
            .eq("is_active", true);

          if (!subs || subs.length === 0) continue;

          const name = product.name?.ru || product.name?.uz || "Товар";

          for (const sub of subs) {
            const text = `⚠️ *Осталось мало!*\n\n` +
              `${name}\n` +
              `Осталось всего ${product.stock} шт.\n\n` +
              `Открыть: https://t.me/${Deno.env.get("BOT_USERNAME") ?? "your_bot"}?startapp=product_${product.slug}`;

            await sendTelegramMessage(botToken, sub.telegram_user_id, text);
            notificationsSent++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_sent: notificationsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Smart notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPrice(price: number): string {
  return new Intl.NumberFormat("uz-UZ", { style: "decimal" }).format(price) + " so'm";
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
