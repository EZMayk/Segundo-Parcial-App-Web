import { Controller, Post, Body, Inject, Get } from "@nestjs/common";
import { GeminiService } from "./gemini/gemini.service";

interface ProcessRequest {
  pregunta: string;
}

interface ProcessResponse {
  success: boolean;
  respuesta?: string;
  error?: string;
}

@Controller("api")
export class AppController {
  constructor(@Inject("GEMINI_SERVICE") private geminiService: GeminiService) {}

  @Post("procesar")
  async procesarSolicitud(
    @Body() body: ProcessRequest
  ): Promise<ProcessResponse> {
    try {
      const { pregunta } = body;

      if (!pregunta) {
        return {
          success: false,
          error: "La pregunta es requerida",
        };
      }

      const respuesta = await this.geminiService.processRequest(pregunta);

      return {
        success: true,
        respuesta,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Error procesando solicitud",
      };
    }
  }

  @Get("health")
  async health(): Promise<{ status: string }> {
    return { status: "API Gateway running" };
  }
}
