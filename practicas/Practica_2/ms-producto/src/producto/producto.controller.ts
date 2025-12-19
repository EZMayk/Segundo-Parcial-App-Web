import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProductoService } from './producto.service';

@Controller('productos')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Post('reservar')
  async reservarStock(@Body() dto: any) {
    try {
      const cantidad = dto.cantidad || dto.cantidad_solicitada;
      const producto = await this.productoService.descontarStock(
        dto.producto_id,
        cantidad,
      );
      return {
        mensaje: 'Stock reservado exitosamente',
        producto,
      };
    } catch (error) {
      return {
        error: error.message,
        producto_id: dto.producto_id,
      };
    }
  }

  @Get(':id')
  async obtenerProducto(@Param('id') id: number) {
    const producto = await this.productoService.obtenerProducto(id);
    return producto || { error: 'Producto no encontrado' };
  }
}
