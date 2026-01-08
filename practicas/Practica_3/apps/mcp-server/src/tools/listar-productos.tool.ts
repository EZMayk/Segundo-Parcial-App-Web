import { BackendClient } from "../services/backend-client";

export class ListarProductosTool {
  constructor(private backendClient: BackendClient) {}

  async execute(params: { nombre?: string }) {
    try {
      // Si se proporciona nombre, buscar por nombre
      if (params.nombre) {
        const response = await this.backendClient.get(
          `/producto/buscar?nombre=${encodeURIComponent(params.nombre)}`
        );
        return {
          success: true,
          data: response.data,
          message: `Productos encontrados con "${params.nombre}"`,
        };
      }

      // Si no, listar todos
      const response = await this.backendClient.get("/producto");
      return {
        success: true,
        data: response.data,
        message: `${response.data.length} productos disponibles`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error al listar productos",
      };
    }
  }
}
