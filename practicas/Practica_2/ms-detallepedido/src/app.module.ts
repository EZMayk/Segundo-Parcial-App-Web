import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DetallePedidoModule } from './detalle-pedido/detalle-pedido.module';
import { WebhookModule } from './webhook/webhook.module';

require('dotenv').config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'ms_detallepedido',
      autoLoadEntities: true,
      synchronize: true,
    }),
    DetallePedidoModule,
    WebhookModule,
  ],
})
export class AppModule {}
