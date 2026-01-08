import { GoogleGenerativeAI } from "@google/generative-ai";
import { MCPClient, ToolSchema } from "../mcp-client/client";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private mcpClient: MCPClient;
  private model: any;

  constructor(apiKey: string, mcpServerUrl: string = "http://localhost:3001") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.mcpClient = new MCPClient(mcpServerUrl);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
  }

  async processRequest(userRequest: string): Promise<string> {
    try {
      // Paso 1: Obtener Tools disponibles del MCP Server
      const tools = await this.mcpClient.listTools();
      const toolDefinitions = this.convertToolsToGeminiFormat(tools);

      // Paso 2: Iniciar chat con Gemini (permite múltiples turnos)
      const chat = this.model.startChat({
        tools: [{ functionDeclarations: toolDefinitions }],
      });

      // Paso 3: Enviar mensaje inicial del usuario
      let response = await chat.sendMessage(userRequest);
      
      // Paso 4: Loop para procesar múltiples tool calls
      let finalResponse = "";
      let maxIterations = 5; // Límite de seguridad
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;
        const candidate = response.response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        
        // Recolectar todos los function calls de esta respuesta
        const functionCalls = parts.filter((p: any) => p.functionCall);
        const textParts = parts.filter((p: any) => p.text);

        // Si hay texto, agregarlo a la respuesta
        for (const part of textParts) {
          finalResponse += part.text;
        }

        // Si no hay function calls, terminamos
        if (functionCalls.length === 0) {
          break;
        }

        // Ejecutar TODOS los function calls
        const functionResponses = [];
        for (const part of functionCalls) {
          const { name, args } = part.functionCall;
          console.log(`🔧 Ejecutando tool: ${name}`, args);

          try {
            const result = await this.mcpClient.callTool(name, args);
            console.log(`✅ Resultado de ${name}:`, result);
            
            functionResponses.push({
              functionResponse: {
                name: name,
                response: result,
              },
            });

            finalResponse += `\n📊 Tool "${name}" ejecutado:\n${JSON.stringify(result, null, 2)}\n`;
          } catch (error: any) {
            console.error(`❌ Error en ${name}:`, error.message);
            
            functionResponses.push({
              functionResponse: {
                name: name,
                response: { error: error.message },
              },
            });

            finalResponse += `\n❌ Error en "${name}": ${error.message}\n`;
          }
        }

        // Enviar resultados de vuelta a Gemini para continuar
        response = await chat.sendMessage(functionResponses);
      }

      return finalResponse || "No se pudo procesar la solicitud";
    } catch (error: any) {
      console.error("Error in Gemini service:", error);
      throw error;
    }
  }

  private convertToolsToGeminiFormat(tools: ToolSchema[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "OBJECT" as any,
        properties: tool.inputSchema.properties,
        required: tool.inputSchema.required,
      },
    }));
  }
}
