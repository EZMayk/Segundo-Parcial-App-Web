import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { WebhookPublisherService } from '../webhook/webhook-publisher.service';

@Injectable()
export class ProductoService {
  private readonly logger = new Logger(ProductoService.name);

  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
    private readonly webhookPublisher: WebhookPublisherService,
  ) {}

  async descontarStock(productoId: number, cantidad: number) {
    const prod = await this.repo.findOne({ where: { id: productoId } });
    if (!prod) throw new Error('Producto no encontrado');

    if (prod.stock < cantidad) {
      throw new Error('Stock insuficiente');
    }

    prod.stock -= cantidad;
    const updated = await this.repo.save(prod);

    // Publicar webhook de reserva
    try {
      await this.webhookPublisher.publishWebhook('producto.reservado', {
        producto_id: updated.id,
        cantidad_reservada: cantidad,
        stock_restante: updated.stock,
        nombre: updated.nombre,
        precio: updated.precio,
      });
    } catch (error) {
      this.logger.error(`Error publishing webhook: ${error.message}`);
    }

    return updated;
  }

  async obtenerProducto(productoId: number) {
    return this.repo.findOne({ where: { id: productoId } });
  }
}
