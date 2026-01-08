// Definición de Tools disponibles en MCP
interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

class ToolRegistry {
  private tools: Map<string, ToolSchema> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Tool 1: Búsqueda de Pedidos
    this.tools.set("buscar_pedido", {
      name: "buscar_pedido",
      description: "Busca pedidos por nombre de cliente o por ID de pedido. Usa nombre_cliente para buscar por nombre.",
      inputSchema: {
        type: "object",
        properties: {
          nombre_cliente: {
            type: "string",
            description: "Nombre del cliente para buscar sus pedidos (ej: 'Juan', 'María')",
          },
          pedido_id: {
            type: "number",
            description: "ID específico del pedido a buscar",
          },
        },
        required: [],
      },
    });

    // Tool 2: Listar Productos
    this.tools.set("listar_productos", {
      name: "listar_productos",
      description: "Lista todos los productos disponibles o busca por nombre. Útil para conocer los productos y sus IDs antes de agregar a un pedido.",
      inputSchema: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del producto a buscar (ej: 'Chifle de Sal', 'Picante')",
          },
        },
        required: [],
      },
    });

    // Tool 3: Validación de Disponibilidad
    this.tools.set("validar_disponibilidad", {
      name: "validar_disponibilidad",
      description: "Valida si hay stock disponible para agregar un producto a un pedido. Puede usar nombre_producto en lugar de producto_id.",
      inputSchema: {
        type: "object",
        properties: {
          pedido_id: {
            type: "number",
            description: "ID del pedido",
          },
          producto_id: {
            type: "number",
            description: "ID del producto a validar (opcional si se usa nombre_producto)",
          },
          nombre_producto: {
            type: "string",
            description: "Nombre del producto a validar (ej: 'Chifle de Sal')",
          },
          cantidad: {
            type: "number",
            description: "Cantidad que se desea agregar",
          },
        },
        required: ["pedido_id", "cantidad"],
      },
    });

    // Tool 4: Crear Detalle de Pedido
    this.tools.set("crear_detalle_pedido", {
      name: "crear_detalle_pedido",
      description: "Agrega un producto a un pedido existente. Puede usar nombre_producto en lugar de producto_id.",
      inputSchema: {
        type: "object",
        properties: {
          pedido_id: {
            type: "number",
            description: "ID del pedido donde agregar el producto",
          },
          producto_id: {
            type: "number",
            description: "ID del producto a agregar (opcional si se usa nombre_producto)",
          },
          nombre_producto: {
            type: "string",
            description: "Nombre del producto a agregar (ej: 'Chifle de Sal', 'Chifle Picante')",
          },
          cantidad: {
            type: "number",
            description: "Cantidad de unidades a agregar",
          },
        },
        required: ["pedido_id", "cantidad"],
      },
    });
  }

  public listTools(): ToolSchema[] {
    return Array.from(this.tools.values());
  }

  public getTool(name: string): ToolSchema | undefined {
    return this.tools.get(name);
  }

  public registerTool(tool: ToolSchema) {
    this.tools.set(tool.name, tool);
  }
}

export const toolRegistry = new ToolRegistry();
