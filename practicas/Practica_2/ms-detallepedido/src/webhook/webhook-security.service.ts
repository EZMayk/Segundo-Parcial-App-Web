import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSecurityService {
  /**
   * Genera una firma HMAC-SHA256 para un webhook
   * @param payload El objeto a firmar
   * @param secret La clave secreta compartida
   * @returns Firma en formato: sha256=hash_hexadecimal
   */
  generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);

    const hmac = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');

    return `sha256=${hmac}`;
  }

  /**
   * Genera un timestamp Unix actual
   * @returns Timestamp en segundos desde epoch
   */
  generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * Genera un UUID v4 para el event_id
   * @returns UUID v4
   */
  generateEventId(): string {
    return 'evt_' + crypto.randomBytes(6).toString('hex');
  }

  /**
   * Genera una clave de idempotencia
   * @param eventType Tipo de evento (ej: 'detalle.creado')
   * @param entityId ID de la entidad (ej: detalle_id)
   * @param timestamp Timestamp del evento
   * @returns Clave de idempotencia
   */
  generateIdempotencyKey(
    eventType: string,
    entityId: number,
    timestamp: string,
  ): string {
    return `${eventType.replace('.', '-')}-${entityId}-${timestamp}`;
  }
}
