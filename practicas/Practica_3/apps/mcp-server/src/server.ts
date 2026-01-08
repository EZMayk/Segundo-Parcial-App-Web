import express from "express";
import { toolRegistry } from "./tools/registry";
import { BackendClient } from "./services/backend-client";
import { BuscarPedidoTool } from "./tools/buscar-pedido.tool";
import { ValidarDisponibilidadTool } from "./tools/validar-disponibilidad.tool";
import { CrearDetallePedidoTool } from "./tools/crear-detalle-pedido.tool";
import { ListarProductosTool } from "./tools/listar-productos.tool";

const app = express();
const PORT = 3001;

app.use(express.json());
const backendClient = new BackendClient("http://localhost:3002");

// Instanciar Tools
const buscarPedido = new BuscarPedidoTool(backendClient);
const validarDisponibilidad = new ValidarDisponibilidadTool(backendClient);
const crearDetallePedido = new CrearDetallePedidoTool(backendClient);
const listarProductos = new ListarProductosTool(backendClient);

// JSON-RPC 2.0 Handler
app.post("/rpc", (req, res) => {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== "2.0") {
    return res.status(400).json({ error: "Invalid JSON-RPC version" });
  }

  // Métodos RPC disponibles
  if (method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      result: toolRegistry.listTools(),
      id,
    });
  }

  if (method === "tools/call") {
    const { toolName, arguments: toolArgs } = params;
    const tool = toolRegistry.getTool(toolName);

    if (!tool) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found" },
        id,
      });
    }

    // Ejecutar el Tool correspondiente
    (async () => {
      try {
        let result;

        switch (toolName) {
          case "buscar_pedido":
            result = await buscarPedido.execute(toolArgs);
            break;

          case "listar_productos":
            result = await listarProductos.execute(toolArgs);
            break;

          case "validar_disponibilidad":
            result = await validarDisponibilidad.execute(toolArgs);
            break;

          case "crear_detalle_pedido":
            result = await crearDetallePedido.execute(toolArgs);
            break;

          default:
            return res.json({
              jsonrpc: "2.0",
              error: { code: -32601, message: "Tool not implemented" },
              id,
            });
        }

        res.json({
          jsonrpc: "2.0",
          result,
          id,
        });
      } catch (error: any) {
        res.json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal error",
            data: error.message,
          },
          id,
        });
      }
    })();
    
    return; // <-- FIX: Agregar return para evitar ejecutar código posterior
  }

  // Solo llega aquí si el método no es reconocido
  return res.status(400).json({
    jsonrpc: "2.0",
    error: { code: -32601, message: "Method not found" },
    id,
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "MCP Server running" });
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Server listening on port ${PORT}`);
  console.log(`📋 Tools available: ${toolRegistry.listTools().length}`);
});
