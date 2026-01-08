import { BackendClient } from "../services/backend-client";

interface CrearDetallePedidoParams {
  pedido_id: number;
  producto_id?: number;
  nombre_producto?: string;
  cantidad: number;
}

export class CrearDetallePedidoTool {
  constructor(private backendClient: BackendClient) {}

  async execute(params: CrearDetallePedidoParams) {
    try {
      let productoId = params.producto_id;

      // Si se proporciona nombre en lugar de ID, buscar el producto
      if (params.nombre_producto && !productoId) {
        const busqueda = await this.backendClient.get(
          `/producto/buscar?nombre=${encodeURIComponent(params.nombre_producto)}`
        );
        
        if (!busqueda.data || busqueda.data.length === 0) {
          return {
            success: false,
            error: `Producto "${params.nombre_producto}" no encontrado`,
          };
        }
        
        productoId = busqueda.data[0].id;
      }

      if (!productoId) {
        return {
          success: false,
          error: "Debe proporcionar producto_id o nombre_producto",
        };
      }

      // Ejecutar POST al Backend para crear detalle
      const response = await this.backendClient.post("/detalle_pedido", {
        pedido_id: params.pedido_id,
        producto_id: productoId,
        cantidad: params.cantidad,
        fecha_creacion: new Date().toISOString(),
      });

      if (response.data && response.data.id) {
        return {
          success: true,
          id: response.data.id,
          mensaje: `✅ Se agregaron ${params.cantidad} unidades al pedido ${params.pedido_id}`,
          detalle: response.data,
        };
      }

      return {
        success: false,
        error: "No se pudo crear el detalle del pedido",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error al crear detalle de pedido",
        detalles_error: error.response?.data || {},
      };
    }
  }
}
