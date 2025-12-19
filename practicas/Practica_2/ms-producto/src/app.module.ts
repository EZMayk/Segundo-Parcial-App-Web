import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ProductoModule } from './producto/producto.module';
import { IdempotenciaModule } from './idempotencia/idempotencia.module';
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
      port: parseInt(process.env.DB_PORT || '5433'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'ms_producto',
      autoLoadEntities: true,
      synchronize: true,
    }),

    ProductoModule,
    IdempotenciaModule,
    WebhookModule,
  ],
})
export class AppModule {}
