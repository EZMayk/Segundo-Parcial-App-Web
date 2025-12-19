import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DetallePedidoController } from './detalle-pedido.controller';

require('dotenv').config();

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'DETALLE_PEDIDO_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://user:pass@localhost:5672'],
          queue: 'ms-detallepedido-queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [DetallePedidoController],
})
export class DetallePedidoModule {}
