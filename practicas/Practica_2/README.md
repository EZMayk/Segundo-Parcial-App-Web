video aqui abajo
https://uleam-my.sharepoint.com/:v:/g/personal/e1316944154_live_uleam_edu_ec/IQBY5wx6crW7Sa4LnijXPVgbAd06-hSfs7qDJEyqo1m67No?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=J32X85
video aqui arriba

-----------------------------------------------------------------------------------------------------------

**FLUJO DE ARCHIVOS IMPORTANTES**

ENTRADA -> gateway/src/detalle-pedido/detalle-pedido.controller.ts
   POST /api/detalle-pedido
   (Enruta por RabbitMQ)

RECEPCION -> ms-detallepedido/src/detalle-pedido/detalle-pedido.controller.ts
   @MessagePattern('detalle.crear')
   (Llama servicio)

LOGICA -> ms-detallepedido/src/detalle-pedido/detalle-pedido.service.ts
   async crearDetalle(dto)
   -Guarda en BD (detalle-pedido.entity.ts -> PostgreSQL)
   -Dispara webhook

PUBLICACION -> ms-detallepedido/src/webhook/webhook-publisher.service.ts
   async publishWebhook(eventType, data)
   Genera IDs únicos + firma HMAC <- webhook-security.service.ts
   Guarda en Supabase webhook_events (auditoria)
   FANOUT: Envía a 3 suscriptores simultáneamente (dos de ellos desactivados en supabase, se muestra en el video)

REINTENTOS -> ms-detallepedido/src/webhook/webhook-publisher.service.ts
   private async sendWebhookWithRetry()
   -Intento 1: Ahora
   -Si falla -> Espera 1m -> Intento 2
   -Si todas fallan -> Dead Letter Queue (dlq_messages)

Tablas clave en Supabase:
   -webhook_events (eventos generados)
   -webhook_subscriptions (quién escucha)
   -webhook_deliveries (historial de intentos)
   -dlq_messages (fallos permanentes)

video de la demostracion del codigo arriba 