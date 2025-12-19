import { Module } from '@nestjs/common';
import { DetallePedidoModule } from './detalle-pedido/detalle-pedido.module';

require('dotenv').config();

@Module({
  imports: [DetallePedidoModule],
})
export class AppModule {}
