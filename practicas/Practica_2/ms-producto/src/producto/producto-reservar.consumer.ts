import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductoService } from './producto.service';
import { IdempotenciaService } from '../idempotencia/idempotencia.service';
import { WebhookPublisherService } from '../webhook/webhook-publisher.service';

@Controller()
export class ProductoReservarConsumer {
  private readonly logger = new Logger(ProductoReservarConsumer.name);

  constructor(
    private readonly productoService: ProductoService,
    private readonly idemService: IdempotenciaService,
    private readonly webhookPublisher: WebhookPublisherService,
  ) {}

  @MessagePattern('producto.reservar')
  async reservar(@Payload() data: any) {
    const { idempotencyKey, payload } = data;

    // 1) Verificar duplicado
    if (await this.idemService.exists(idempotencyKey)) {
      this.logger.warn('⚠️ Mensaje duplicado ignorado: ' + idempotencyKey);
      return { status: 'duplicate' };
    }

    // 2) Intentar registrar clave (maneja race condition)
    try {
      await this.idemService.register(idempotencyKey, payload.detallePedidoId);
    } catch (error) {
      // Si falla por clave duplicada, es un mensaje duplicado (race condition)
      if (error.code === '23505') {
        this.logger.warn(
          '⚠️ Mensaje duplicado ignorado (race condition): ' + idempotencyKey,
        );
        return { status: 'duplicate' };
      }
      throw error; // Re-lanzar si es otro error
    }

    // 3) Procesar negocio
    await this.productoService.descontarStock(
      payload.productoId,
      payload.cantidad_solicitada,
    );

    this.logger.log('✔️ Stock actualizado correctamente');

    // 4) Emitir webhook de evento 'producto.reservado'
    try {
      await this.webhookPublisher.publishWebhook(
        'producto.reservado',
        {
          producto_id: payload.productoId,
          cantidad_reservada: payload.cantidad_solicitada,
          detalle_pedido_id: payload.detallePedidoId,
          timestamp: new Date().toISOString(),
        },
        {
          source: 'ms-producto',
          event_name: 'producto.reservado',
          correlation_id: `req_${Date.now()}`,
        },
      );
      this.logger.log('✅ Webhook enviado: producto.reservado');
    } catch (error) {
      this.logger.error('❌ Error al publicar webhook: ' + error.message);
      // No lanzar error, continuar aunque falle el webhook
    }

    return { status: 'processed' };
  }
}
