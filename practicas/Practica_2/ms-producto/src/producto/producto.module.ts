import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { ProductoService } from './producto.service';
import { ProductoController } from './producto.controller';
import { ProductoReservarConsumer } from './producto-reservar.consumer';
import { IdempotenciaModule } from '../idempotencia/idempotencia.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto]),
    IdempotenciaModule,
    WebhookModule,
  ],
  providers: [ProductoService],
  controllers: [ProductoController, ProductoReservarConsumer],
})
export class ProductoModule {}
