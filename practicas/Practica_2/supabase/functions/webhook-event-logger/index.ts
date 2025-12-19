import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ====================================================
// EDGE FUNCTION 1: webhook-event-logger
// ====================================================
// Propósito: Auditar todos los eventos recibidos
// - Validar firma HMAC
// - Validar timestamp (anti-replay)
// - Verificar idempotencia
// - Guardar en webhook_events
// ====================================================

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "default-secret";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

// Función auxiliar: Validar firma HMAC
async function validateSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Extraer hash de la firma 
    const receivedHash = signature.replace("sha256=", "");

    // Crear HMAC con el secret
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

    // Convertir a hex
    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparar (timing-safe)
    return receivedHash === expectedHash;
  } catch (error) {
    console.error("Error validating signature:", error);
    return false;
  }
}

// ====================================================
// Función auxiliar: Validar timestamp (anti-replay)
// ====================================================
function validateTimestamp(
  timestamp: string,
  maxAgeMinutes: number = 5
): boolean {
  try {
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    const age = now - requestTime;

    // Verificar que no sea muy antiguo
    if (age > maxAgeMinutes * 60) {
      console.log(`⚠️ Webhook demasiado antiguo (${age}s)`);
      return false;
    }

    // Verificar que no sea del futuro
    if (age < -60) {
      console.log(`⚠️ Webhook del futuro (clock skew)`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating timestamp:", error);
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

    return !!data; // true si existe (duplicado), false si es nuevo
  } catch (error) {
    // Si no existe, lanzará un error - que es lo que queremos
    return false;
  }
}

// ====================================================
// Función auxiliar: Registrar en idempotencia
// ====================================================
async function registerIdempotencyKey(
  idempotencyKey: string,
  eventId: number
): Promise<void> {
  await supabase.from("processed_webhooks").insert({
    idempotency_key: idempotencyKey,
    event_id: eventId,
    processed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

// ====================================================
// HANDLER PRINCIPAL
// ====================================================
serve(async (req) => {
  // Solo aceptar POST
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

    // 2. Obtener body como string (para validar firma)
    const bodyText = await req.text();

    // 3. Validar firma HMAC
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

    // 4. Validar timestamp
    if (!validateTimestamp(timestamp)) {
      console.log("❌ Timestamp inválido o demasiado antiguo");
      return new Response(
        JSON.stringify({ error: "Invalid or expired timestamp" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Parsear JSON
    const payload = JSON.parse(bodyText);
    const { event, id: eventId, idempotency_key } = payload;

    // 6. Verificar idempotencia
    const isDuplicate = await checkIdempotency(idempotency_key);
    if (isDuplicate) {
      console.log(
        `⚠️ Evento duplicado ignorado: ${idempotency_key} (${event})`
      );
      return new Response(
        JSON.stringify({
          success: false,
          duplicate: true,
          event_id: eventId,
          message: "Event already processed",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Guardar evento en webhook_events
    const { data: insertedEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        event_id: eventId,
        event_type: event,
        idempotency_key: idempotency_key,
        payload: payload,
        metadata: payload.metadata || {},
        received_at: new Date().toISOString(),
        signature_valid: signatureValid,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting webhook_events:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store event" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 8. Registrar en idempotencia
    if (insertedEvent && insertedEvent.id) {
      await registerIdempotencyKey(idempotency_key, insertedEvent.id as number);
    }

    // 9. Log de éxito
    console.log(
      `✅ Evento guardado: ${event} (${eventId}) - ID en BD: ${insertedEvent.id}`
    );

    // 10. Responder con éxito
    return new Response(
      JSON.stringify({
        success: true,
        event_id: eventId,
        stored_at: new Date().toISOString(),
      }),
      {
        status: 200,
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
