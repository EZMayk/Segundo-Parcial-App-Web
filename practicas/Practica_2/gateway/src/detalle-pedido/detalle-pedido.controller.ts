import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('detalle-pedido')
export class DetallePedidoController {
  constructor(
    @Inject('DETALLE_PEDIDO_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  @Post()
  async crear(@Body() dto: any) {
    const response = await firstValueFrom(
      this.client.send('detalle.crear', dto),
    );

    return response;
  }
}
