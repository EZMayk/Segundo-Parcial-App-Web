import { BackendClient } from "../services/backend-client";

interface ValidarDisponibilidadParams {
  pedido_id: number;
  producto_id?: number;
  nombre_producto?: string;
  cantidad: number;
}

export class ValidarDisponibilidadTool {
  constructor(private backendClient: BackendClient) {}

  async execute(params: ValidarDisponibilidadParams) {
    try {
      // Paso 1: Verificar que el pedido existe
      const pedidoResponse = await this.backendClient.get(
        `/pedido/${params.pedido_id}`
      );

      if (!pedidoResponse.data) {
        return {
          valido: false,
          razon: `Pedido ${params.pedido_id} no existe`,
        };
      }

      // Paso 2: Obtener el producto (por ID o por nombre)
      let productoResponse;
      
      if (params.nombre_producto) {
        // Buscar por nombre
        productoResponse = await this.backendClient.get(
          `/producto/buscar?nombre=${encodeURIComponent(params.nombre_producto)}`
        );
        if (!productoResponse.data || productoResponse.data.length === 0) {
          return {
            valido: false,
            razon: `Producto "${params.nombre_producto}" no encontrado`,
          };
        }
        // Tomar el primer producto que coincida
        productoResponse.data = productoResponse.data[0];
      } else if (params.producto_id) {
        productoResponse = await this.backendClient.get(
          `/producto/${params.producto_id}`
        );
      } else {
        return {
          valido: false,
          razon: "Debe proporcionar producto_id o nombre_producto",
        };
      }

      if (!productoResponse.data) {
        return {
          valido: false,
          razon: `Producto no encontrado`,
        };
      }

      const producto = productoResponse.data;

      // Paso 3: Validar cantidad
      if (params.cantidad <= 0) {
        return {
          valido: false,
          razon: "La cantidad debe ser mayor a 0",
        };
      }

      // Paso 4: Validar stock disponible
      const stock = producto.stock || 0;
      if (stock < params.cantidad) {
        return {
          valido: false,
          razon: `Stock insuficiente. Disponible: ${stock}, Solicitado: ${params.cantidad}`,
          producto: producto.nombre,
          stock_disponible: stock,
        };
      }

      // Todo validó correctamente
      return {
        valido: true,
        mensaje: `✅ Validación exitosa para "${producto.nombre}"`,
        producto: producto.nombre,
        producto_id: producto.id,
        precio_unitario: producto.precio,
        stock_disponible: stock,
        cantidad_solicitada: params.cantidad,
        subtotal_estimado: producto.precio * params.cantidad,
      };
    } catch (error: any) {
      return {
        valido: false,
        razon: error.message || "Error al validar disponibilidad",
      };
    }
  }
}
