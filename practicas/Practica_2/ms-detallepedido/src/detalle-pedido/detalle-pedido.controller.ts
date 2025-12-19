import { Controller, Post, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DetallePedidoService } from './detalle-pedido.service';

@Controller('detalles-pedidos')
export class DetallePedidoController {
  constructor(private readonly service: DetallePedidoService) {}

  @Post()
  async crear(@Body() dto: any) {
    return this.service.crearDetalle(dto);
  }

  @MessagePattern('detalle.crear')
  async crearDetalle(@Payload() dto: any) {
    return this.service.crearDetalle(dto);
  }
}
