import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Conectar a RabbitMQ comentado: no disponible en el entorno actual
  // app.connectMicroservice({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [process.env.RABBITMQ_URL],
  //     queue: 'ms-detallepedido-queue',
  //     queueOptions: { durable: true },
  //   },
  // });

  // await app.startAllMicroservices();
  await app.listen(3002);

  console.log('🚀 MS-DetallePedido listo en http://localhost:3002');
}
bootstrap();
