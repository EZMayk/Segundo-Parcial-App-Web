import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { WebhookSecurityService } from './webhook-security.service';

@Injectable()
export class WebhookPublisherService {
  private readonly logger = new Logger(WebhookPublisherService.name);
  private readonly webhookSecret: string;
  private readonly maxRetries = 6;
  private readonly supabase: SupabaseClient | null;
  private retryDelays = [60000, 300000, 1800000, 7200000, 43200000, 86400000]; // 1m, 5m, 30m, 2h, 12h, 24h

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly securityService: WebhookSecurityService,
  ) {
    this.webhookSecret =
      configService.get('WEBHOOK_SECRET') || 'default-secret';

    // Inicializar cliente Supabase
    const supabaseUrl = configService.get('SUPABASE_PROJECT_URL');
    const supabaseKey = configService.get('SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      this.logger.warn('Supabase credentials not configured');
      this.supabase = null;
    }
  }

  /**
   * Publica un webhook a múltiples suscriptores (fanout)
   * @param eventType Tipo de evento (ej: 'producto.reservado')
   * @param data Datos del evento
   * @param metadata Metadatos (source, environment, correlation_id)
   */
  async publishWebhook(
    eventType: string,
    data: any,
    metadata?: any,
  ): Promise<void> {
    try {
      // 1. Generar IDs y timestamps
      const eventId = this.securityService.generateEventId();
      const timestamp = new Date().toISOString();
      const idempotencyKey = this.securityService.generateIdempotencyKey(
        eventType,
        data.producto_id || 0,
        timestamp,
      );

      // 2. Construir payload estándar
      const webhook = {
        event: eventType,
        version: '1.0',
        id: eventId,
        idempotency_key: idempotencyKey,
        timestamp: timestamp,
        data: data,
        metadata: metadata || {
          source: 'ms-producto',
          environment: this.configService.get('NODE_ENV') || 'development',
          correlation_id: `req_${Date.now()}`,
        },
      };

      // 3. Firmar el webhook
      const signature = this.securityService.generateSignature(
        webhook,
        this.webhookSecret,
      );

      // 4. Guardar evento en webhook_events (Supabase)
      if (this.supabase) {
        try {
          const { error: insertError } = await this.supabase
            .from('webhook_events')
            .insert({
              event_id: eventId,
              event_type: eventType,
              idempotency_key: idempotencyKey,
              payload: webhook,
              metadata: webhook.metadata,
              received_at: timestamp,
              status: 'pending',
            });

          if (insertError) {
            this.logger.error(
              `Error saving webhook event: ${insertError.message}`,
            );
          } else {
            this.logger.log(`📥 Event saved to webhook_events: ${eventId}`);
          }
        } catch (error) {
          this.logger.error(`Error inserting webhook event: ${error.message}`);
        }
      }

      // 5. Obtener suscriptores de Supabase
      const subscribers = await this.getSubscribers(eventType);

      if (subscribers.length === 0) {
        this.logger.warn(`No subscribers for event: ${eventType}`);
        return;
      }

      // 6. Enviar a cada suscriptor (FANOUT)
      for (const subscriber of subscribers) {
        if (!subscriber.is_active) continue;

        // Enviar de forma asincrónica sin bloquear
        this.sendWebhookWithRetry(
          subscriber.url,
          webhook,
          signature,
          subscriber.id,
          eventId,
          0,
        ).catch((error) => {
          this.logger.error(
            `Error sending webhook to ${subscriber.url}: ${error.message}`,
          );
        });
      }

      this.logger.log(
        `✅ Published event: ${eventType} (${eventId}) to ${subscribers.length} subscribers`,
      );
    } catch (error) {
      this.logger.error(`Error publishing webhook: ${error.message}`);
    }
  }

  /**
   * Envía un webhook con retry exponencial
   * @param url URL del suscriptor
   * @param webhook Payload del webhook
   * @param signature Firma HMAC
   * @param subscriptionId ID de la suscripción
   * @param attemptNumber Número de intento (0-based)
   */
  private async sendWebhookWithRetry(
    url: string,
    webhook: any,
    signature: string,
    subscriptionId: number,
    eventId: string,
    attemptNumber: number,
  ): Promise<void> {
    try {
      const attempt = attemptNumber + 1;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      this.logger.log(
        `Sending webhook attempt ${attempt}/${this.maxRetries} to: ${url}`,
      );

      // Enviar el webhook
      const response = await firstValueFrom(
        this.httpService.post(url, webhook, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
          },
          timeout: 10000,
        }),
      );

      // Si éxito (200-299)
      if (response.status >= 200 && response.status < 300) {
        this.logger.log(
          `✅ Webhook delivered successfully to: ${url} (attempt ${attempt})`,
        );

        // Registrar entrega exitosa
        if (this.supabase) {
          try {
            await this.supabase.from('webhook_deliveries').insert({
              subscription_id: subscriptionId,
              event_id: eventId,
              attempt_number: attempt,
              status_code: response.status,
              status: 'success',
              response_body: JSON.stringify(response.data),
              delivered_at: new Date().toISOString(),
            });
          } catch (err) {
            this.logger.warn(`Failed to log delivery: ${err.message}`);
          }
        }
        return;
      }

      // Si error, reintentar
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      this.logger.warn(
        `❌ Webhook delivery failed (attempt ${attemptNumber + 1}): ${error.message}`,
      );

      // Registrar intento fallido
      if (this.supabase) {
        try {
          const nextRetryAt =
            attemptNumber < this.maxRetries - 1
              ? new Date(
                  Date.now() + this.retryDelays[attemptNumber],
                ).toISOString()
              : null;

          await this.supabase.from('webhook_deliveries').insert({
            subscription_id: subscriptionId,
            event_id: eventId,
            attempt_number: attemptNumber + 1,
            status:
              attemptNumber >= this.maxRetries - 1
                ? 'failed'
                : 'retry_scheduled',
            error_message: error.message,
            delivered_at: new Date().toISOString(),
            next_retry_at: nextRetryAt,
          });
        } catch (err) {
          this.logger.warn(`Failed to log delivery attempt: ${err.message}`);
        }
      }

      // Si no hay más intentos, guardar en DLQ
      if (attemptNumber >= this.maxRetries - 1) {
        this.logger.error(
          `🗑️ Webhook failed after ${this.maxRetries} attempts. Moving to DLQ: ${url}`,
        );

        // Guardar en DLQ
        if (this.supabase) {
          try {
            await this.supabase.from('dlq_messages').insert({
              subscription_id: subscriptionId,
              event_id: eventId,
              payload: { url, error: error.message },
              error_reason: `Failed after ${this.maxRetries} attempts: ${error.message}`,
              created_at: new Date().toISOString(),
              status: 'pending',
            });
          } catch (err) {
            this.logger.warn(`Failed to log DLQ message: ${err.message}`);
          }
        }
        return;
      }

      // Reintentar después del delay
      const delay = this.retryDelays[attemptNumber];
      this.logger.log(
        `⏳ Retrying in ${delay / 1000}s (attempt ${attemptNumber + 2}/${this.maxRetries})`,
      );

      setTimeout(() => {
        this.sendWebhookWithRetry(
          url,
          webhook,
          signature,
          subscriptionId,
          eventId,
          attemptNumber + 1,
        ).catch((error) => {
          this.logger.error(`Retry failed: ${error.message}`);
        });
      }, delay);
    }
  }

  /**
   * Obtiene los suscriptores activos para un tipo de evento desde Supabase
   */
  private async getSubscribers(eventType: string): Promise<
    Array<{
      id: number;
      url: string;
      is_active: boolean;
    }>
  > {
    try {
      if (!this.supabase) {
        this.logger.warn('Supabase not configured, skipping subscriber fetch');
        return [];
      }

      const { data, error } = await this.supabase
        .from('webhook_subscriptions')
        .select('id, url, is_active')
        .eq('event_type', eventType)
        .eq('is_active', true);

      if (error) {
        this.logger.error(`Error fetching subscribers: ${error.message}`);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error(`Error in getSubscribers: ${error.message}`);
      return [];
    }
  }
}
