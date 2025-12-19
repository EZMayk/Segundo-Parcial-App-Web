import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ====================================================
// EDGE FUNCTION 2: webhook-external-notifier
// ====================================================
// Propósito: Enviar notificaciones a sistemas externos
// - Validar firma HMAC
// - Verificar idempotencia
// - Enviar a Telegram Bot
// - Guardar resultado de notificación
// ====================================================

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "default-secret";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// ====================================================
// Función auxiliar: Validar firma HMAC
// ====================================================
async function validateSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const receivedHash = signature.replace("sha256=", "");

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);

    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return receivedHash === expectedHash;
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
}

// ====================================================
// Función auxiliar: Verificar idempotencia
// ====================================================
async function checkIdempotency(idempotencyKey: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("processed_webhooks")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    return !!data;
  } catch (error) {
    return false;
  }
}

// ====================================================
// Función auxiliar: Registrar idempotencia
// ====================================================
async function registerIdempotencyKey(
  idempotencyKey: string,
  eventId: number
): Promise<void> {
  await supabase
    .from("processed_webhooks")
    .insert({
      idempotency_key: idempotencyKey,
      event_id: eventId,
      processed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select();
}

// ====================================================
// Función auxiliar: Enviar a Telegram
// ====================================================
async function sendTelegram(message: string): Promise<boolean> {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.log("⚠️ Telegram no configurado, saltando notificación");
      return true; // No fallar si Telegram no está configurado
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (data.ok) {
      console.log(`✅ Mensaje enviado a Telegram`);
      return true;
    } else {
      console.error(`❌ Error de Telegram:`, data.description);
      return false;
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    return false;
  }
}

// ====================================================
// Función auxiliar: Guardar notificación en BD
// ====================================================
async function saveNotificationLog(
  webhookEventId: number,
  eventType: string,
  success: boolean,
  message: string
): Promise<void> {
  try {
    await supabase.from("webhook_audit_log").insert({
      event_id: webhookEventId.toString(),
      action: "notification_sent",
      details: {
        event_type: eventType,
        success: success,
        message: message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving notification log:", error);
  }
}

// ====================================================
// HANDLER PRINCIPAL
// ====================================================
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Obtener headers
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    if (!signature || !timestamp) {
      return new Response(
        JSON.stringify({ error: "Missing required headers" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Obtener body
    const bodyText = await req.text();

    // 3. Validar firma
    const signatureValid = await validateSignature(
      bodyText,
      signature,
      WEBHOOK_SECRET
    );
    if (!signatureValid) {
      console.log("❌ Firma HMAC inválida");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Parsear JSON
    const payload = JSON.parse(bodyText);
    const {
      event,
      id: eventId,
      idempotency_key,
      data,
      timestamp: eventTimestamp,
    } = payload;

    // 5. Verificar idempotencia
    const isDuplicate = await checkIdempotency(idempotency_key);
    if (isDuplicate) {
      console.log(
        `⚠️ Notificación duplicada ignorada: ${idempotency_key} (${event})`
      );
      return new Response(
        JSON.stringify({
          success: false,
          duplicate: true,
          event_id: eventId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Obtener el webhook_events para guardar auditoría
    const { data: webhookEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .single();

    const webhookEventId =
      webhookEvent && webhookEvent.id
        ? (webhookEvent.id as unknown as number)
        : 0;

    // 7. Construir mensaje para notificación
    let telegramMessage = `<b>🔔 ${event}</b>\n\n`;

    if (event === "detalle.creado") {
      telegramMessage += `<b>Nuevo Detalle de Pedido</b>\n`;
      telegramMessage += `📦 Detalle ID: <code>${data.detalle_id}</code>\n`;
      telegramMessage += `🛒 Pedido ID: <code>${data.pedido_id}</code>\n`;
      telegramMessage += `📝 Producto: <code>${data.producto_id}</code>\n`;
      telegramMessage += `📊 Cantidad: ${data.cantidad_solicitada}\n`;
      telegramMessage += `💰 Subtotal: $${data.subtotal}`;
    } else if (event === "producto.reservado") {
      telegramMessage += `<b>Stock Reservado</b>\n`;
      telegramMessage += `📦 Producto ID: <code>${data.producto_id}</code>\n`;
      telegramMessage += `✅ Cantidad Reservada: ${data.cantidad_reservada}\n`;
      telegramMessage += `📈 Stock Restante: ${data.stock_restante}\n`;
      telegramMessage += `🔗 Detalle: <code>${data.detalle_id}</code>`;
    } else {
      telegramMessage += `<b>Evento Personalizado</b>\n`;
      telegramMessage += `<code>${JSON.stringify(data, null, 2)}</code>`;
    }

    telegramMessage += `\n\n⏰ ${new Date(eventTimestamp).toLocaleString()}`;

    // 8. Enviar notificación
    const notificationSuccess = await sendTelegram(telegramMessage);

    // 9. Registrar idempotencia
    await registerIdempotencyKey(idempotency_key, webhookEventId);

    // 10. Guardar en auditoría
    if (webhookEventId > 0) {
      await saveNotificationLog(
        webhookEventId,
        event,
        notificationSuccess,
        telegramMessage
      );
    }

    // 11. Responder
    const statusCode = notificationSuccess ? 200 : 500;
    return new Response(
      JSON.stringify({
        success: notificationSuccess,
        event_id: eventId,
        notification_sent: notificationSuccess,
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
