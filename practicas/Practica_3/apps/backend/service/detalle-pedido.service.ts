import { Detalle_Pedido } from "../domain/detalle_pedido";
import { PedidoService } from "./pedido.service";
import { ProductoService } from "./producto.service";

// Base de datos en memoria
const detalles: Detalle_Pedido[] = [];

// Extendemos la interfaz para incluir producto en lugar de chicle
interface DetallePedidoExtendido {
    id: number;
    pedido_id: number;
    producto_id: number;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    fecha_creacion: string;
}

const detallesExtendidos: DetallePedidoExtendido[] = [];

export class DetallePedidoService {
    constructor(
        private pedidoService: PedidoService,
        private productoService: ProductoService
    ) {}

    crear(pedidoId: number, productoId: number, cantidad: number): DetallePedidoExtendido | { error: string } {
        // Validar que el pedido existe
        const pedido = this.pedidoService.consultar(pedidoId);
        if (!pedido) {
            return { error: `Pedido ${pedidoId} no encontrado` };
        }

        // Validar que el producto existe
        const producto = this.productoService.consultar(productoId);
        if (!producto) {
            return { error: `Producto ${productoId} no encontrado` };
        }

        // Validar stock disponible
        if (producto.stock < cantidad) {
            return { error: `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${cantidad}` };
        }

        // Reducir stock
        this.productoService.reducirStock(productoId, cantidad);

        // Crear el detalle
        const nuevoDetalle: DetallePedidoExtendido = {
            id: detallesExtendidos.length + 1,
            pedido_id: pedidoId,
            producto_id: productoId,
            cantidad: cantidad,
            precio_unitario: producto.precio,
            subtotal: producto.precio * cantidad,
            fecha_creacion: new Date().toISOString()
        };

        detallesExtendidos.push(nuevoDetalle);
        return nuevoDetalle;
    }

    listar(): DetallePedidoExtendido[] {
        return detallesExtendidos;
    }

    consultar(id: number): DetallePedidoExtendido | undefined {
        return detallesExtendidos.find((d) => d.id === id);
    }

    listarPorPedido(pedidoId: number): DetallePedidoExtendido[] {
        return detallesExtendidos.filter((d) => d.pedido_id === pedidoId);
    }

    borrar(id: number): boolean {
        const idx = detallesExtendidos.findIndex((d) => d.id === id);
        if (idx === -1) return false;
        
        detallesExtendidos.splice(idx, 1);
        return true;
    }
}
