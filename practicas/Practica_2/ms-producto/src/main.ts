import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

require('dotenv').config();

async function bootstrap() {
  // RabbitMQ comentado: no disponible en el entorno actual
  // const rabbitMQUrl =
  //   process.env.RABBITMQ_URL || 'amqp://user:pass@localhost:5672';
  // console.log('🔗 Conectando a RabbitMQ:', rabbitMQUrl);

  // Usar createNestApplication en lugar de createMicroservice para evitar RabbitMQ
  const app = await NestFactory.create(AppModule);
  // const app = await NestFactory.createMicroservice(AppModule, {
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [rabbitMQUrl],
  //     queue: 'ms-producto-queue',
  //     queueOptions: { durable: true },
  //   },
  // });

  // await app.listen();
  await app.listen(3003);
  console.log('🚀 MS-Producto escuchando en http://localhost:3003');
}
bootstrap();
