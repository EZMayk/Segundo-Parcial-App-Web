-- ===============================================
-- SCHEMA DE WEBHOOKS PARA PRACTICA_2
-- ===============================================
-- Ejecutar este archivo en la BD de Supabase
-- psql -U postgres -d postgres -f db-schema.sql

-- ===============================================
-- TABLA 1: webhook_subscriptions
-- Gestiona URLs suscritas a eventos
-- ===============================================
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_config JSONB DEFAULT '{
    "max_attempts": 6,
    "backoff_type": "exponential",
    "initial_delay_ms": 60000,
    "delays": [60000, 300000, 1800000, 7200000, 43200000, 86400000]
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_triggered_at TIMESTAMP,
  CONSTRAINT unique_event_url UNIQUE(event_type, url)
);

-- ===============================================
-- TABLA 2: webhook_events
-- Registro de todos los eventos recibidos
-- ===============================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  received_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  signature_valid BOOLEAN DEFAULT NULL
);

-- ===============================================
-- TABLA 3: webhook_deliveries
-- Auditoría de intentos de entrega
-- ===============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
  event_id VARCHAR(255) REFERENCES webhook_events(event_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status_code INTEGER,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retry_scheduled')),
  error_message TEXT,
  response_body TEXT,
  delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  next_retry_at TIMESTAMP,
  CONSTRAINT check_positive_attempts CHECK (attempt_number > 0)
);

-- ===============================================
-- TABLA 4: processed_webhooks
-- Control de idempotencia (deduplicación)
-- ===============================================
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id SERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  event_id INTEGER REFERENCES webhook_events(id) ON DELETE CASCADE,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- ===============================================
-- TABLA 5: dlq_messages (Dead Letter Queue)
-- Mensajes que fallaron permanentemente
-- ===============================================
CREATE TABLE IF NOT EXISTS dlq_messages (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER REFERENCES webhook_subscriptions(id) ON DELETE SET NULL,
  event_id VARCHAR(255) REFERENCES webhook_events(event_id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  error_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'replayed', 'discarded', 'archived'))
);

-- ===============================================
-- TABLA 6: webhook_audit_log (Auditoría)
-- Log detallado para debugging
-- ===============================================
CREATE TABLE IF NOT EXISTS webhook_audit_log (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255),
  action VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===============================================
-- ÍNDICES PARA PERFORMANCE
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type 
  ON webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency_key 
  ON webhook_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at 
  ON webhook_events(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription 
  ON webhook_deliveries(subscription_id, status);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status 
  ON webhook_deliveries(status, attempt_number);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_id 
  ON webhook_deliveries(event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry 
  ON webhook_deliveries(next_retry_at) 
  WHERE status = 'retry_scheduled' AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_expires_at 
  ON processed_webhooks(expires_at);

CREATE INDEX IF NOT EXISTS idx_dlq_messages_status 
  ON dlq_messages(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_event_id 
  ON webhook_audit_log(event_id);

-- ===============================================
-- FUNCIÓN: Cleanup de webhooks expirados
-- Se ejecuta con cron job
-- ===============================================
CREATE OR REPLACE FUNCTION cleanup_expired_webhooks()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhooks 
  WHERE expires_at < NOW();
  
  DELETE FROM webhook_audit_log 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- FUNCIÓN: Mover webhook a DLQ si falla definitivamente
-- ===============================================
CREATE OR REPLACE FUNCTION move_to_dlq_if_final_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attempt_number >= 6 AND NEW.status = 'failed' THEN
    INSERT INTO dlq_messages (subscription_id, event_id, payload, error_reason)
    VALUES (
      NEW.subscription_id,
      NEW.event_id,
      (SELECT payload FROM webhook_events WHERE event_id = NEW.event_id),
      NEW.error_message
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para mover a DLQ
CREATE TRIGGER trg_move_to_dlq
AFTER UPDATE ON webhook_deliveries
FOR EACH ROW
EXECUTE FUNCTION move_to_dlq_if_final_failure();

-- ===============================================
-- INSERTS DE PRUEBA (OPCIONAL)
-- ===============================================
INSERT INTO webhook_subscriptions (event_type, url, secret, is_active)
VALUES
  ('detalle.creado', 'https://placeholder.supabase.co/functions/v1/webhook-event-logger', 'secret_logger_123', false),
  ('detalle.creado', 'https://placeholder.supabase.co/functions/v1/webhook-external-notifier', 'secret_notifier_456', false),
  ('producto.reservado', 'https://placeholder.supabase.co/functions/v1/webhook-event-logger', 'secret_logger_123', false),
  ('producto.reservado', 'https://placeholder.supabase.co/functions/v1/webhook-external-notifier', 'secret_notifier_456', false)
ON CONFLICT DO NOTHING;

-- ===============================================
-- VISTA: Resumen de entregas
-- ===============================================
CREATE OR REPLACE VIEW v_webhook_delivery_summary AS
SELECT 
  ws.event_type,
  ws.url,
  COUNT(wd.id) as total_deliveries,
  SUM(CASE WHEN wd.status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN wd.status = 'failed' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN wd.status = 'retry_scheduled' THEN 1 ELSE 0 END) as pending_retry,
  AVG(wd.duration_ms) as avg_duration_ms
FROM webhook_subscriptions ws
LEFT JOIN webhook_deliveries wd ON ws.id = wd.subscription_id
GROUP BY ws.id, ws.event_type, ws.url;

-- ===============================================
-- VISTA: Mensajes en DLQ
-- ===============================================
CREATE OR REPLACE VIEW v_dlq_pending AS
SELECT 
  dlq.id,
  dlq.event_id,
  ws.url,
  dlq.error_reason,
  dlq.created_at,
  EXTRACT(HOUR FROM (NOW() - dlq.created_at)) as hours_pending
FROM dlq_messages dlq
LEFT JOIN webhook_subscriptions ws ON dlq.subscription_id = ws.id
WHERE dlq.status = 'pending'
ORDER BY dlq.created_at ASC;

-- ===============================================
-- FIN DEL SCHEMA
-- ===============================================
