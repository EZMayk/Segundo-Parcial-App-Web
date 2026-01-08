import { BackendClient } from "../services/backend-client";

interface BuscarPedidoParams {
  nombre_cliente?: string;
  pedido_id?: number;
}

export class BuscarPedidoTool {
  constructor(private backendClient: BackendClient) {}

  async execute(params: BuscarPedidoParams) {
    try {
      // Si pide pedido específico
      if (params.pedido_id) {
        const response = await this.backendClient.get(
          `/pedido/${params.pedido_id}`
        );
        return {
          success: true,
          data: response.data,
          message: `Pedido ${params.pedido_id} encontrado`,
        };
      }

      // Si busca por nombre de cliente
      if (params.nombre_cliente) {
        const response = await this.backendClient.get(
          `/pedido/buscar?nombre_cliente=${encodeURIComponent(params.nombre_cliente)}`
        );
        return {
          success: true,
          data: response.data,
          message: `Pedidos encontrados para cliente "${params.nombre_cliente}"`,
        };
      }

      // Si no hay parámetros, listar todos los pedidos
      const response = await this.backendClient.get("/pedido");
      return {
        success: true,
        data: response.data,
        message: `${response.data.length} pedidos encontrados`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error al buscar pedido",
      };
    }
  }
}
