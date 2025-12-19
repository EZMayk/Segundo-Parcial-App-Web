-- ===============================================
-- INSERT SUSCRIPTORES DE WEBHOOKS
-- Ejecutar en Supabase SQL Editor
-- ===============================================

INSERT INTO webhook_subscriptions 
  (event_type, url, secret, is_active, created_at, updated_at) 
VALUES 
  (
    'detalle.creado',
    'https://webhook.site/b5eea99a-0edc-40c4-b3c8-071318badca2',
    'my-super-secret-webhook-key-for-hmac-sha256-signing',
    true,
    NOW(),
    NOW()
  ),
  (
    'producto.reservado',
    'https://webhook.site/b5eea99a-0edc-40c4-b3c8-071318badca2',
    'my-super-secret-webhook-key-for-hmac-sha256-signing',
    true,
    NOW(),
    NOW()
  )
ON CONFLICT (event_type, url) DO NOTHING;

-- Verificar suscriptores creados
SELECT id, event_type, url, is_active FROM webhook_subscriptions;
