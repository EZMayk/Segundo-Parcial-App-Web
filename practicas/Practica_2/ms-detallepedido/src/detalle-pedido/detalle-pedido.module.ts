import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DetallePedido } from './detalle-pedido.entity';
import { DetallePedidoService } from './detalle-pedido.service';
import { DetallePedidoController } from './detalle-pedido.controller';
import { WebhookModule } from '../webhook/webhook.module';

require('dotenv').config();

@Module({
  imports: [
    TypeOrmModule.forFeature([DetallePedido]),
    WebhookModule,
    // ClientsModule comentado: RabbitMQ no está disponible en el entorno actual
    // Para usar RabbitMQ, descomenta lo siguiente y levanta RabbitMQ
    // ClientsModule.register([
    //   {
    //     name: 'PRODUCTO_SERVICE',
    //     transport: Transport.RMQ,
    //     options: {
    //       urls: [process.env.RABBITMQ_URL || 'amqp://user:pass@localhost:5672'],
    //       queue: 'ms-producto-queue',
    //       queueOptions: { durable: true },
    //     },
    //   },
    // ]),
  ],
  providers: [DetallePedidoService],
  controllers: [DetallePedidoController],
})
export class DetallePedidoModule {}
