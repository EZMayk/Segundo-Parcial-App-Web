import axios, { AxiosInstance } from "axios";

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export class MCPClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(mcpServerUrl: string = "http://localhost:3001") {
    this.baseURL = mcpServerUrl;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });
  }

  async listTools(): Promise<ToolSchema[]> {
    try {
      const response = await this.client.post("/rpc", {
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1,
      });

      return response.data.result || [];
    } catch (error: any) {
      console.error("Error listing tools:", error.message);
      return [];
    }
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    try {
      const response = await this.client.post("/rpc", {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          toolName,
          arguments: args,
        },
        id: Math.floor(Math.random() * 10000),
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
    } catch (error: any) {
      console.error(`Error calling tool ${toolName}:`, error.message);
      throw error;
    }
  }
}
