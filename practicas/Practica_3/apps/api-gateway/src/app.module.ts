import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GeminiService } from "./gemini/gemini.service";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    {
      provide: "GEMINI_SERVICE",
      useFactory: () => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY environment variable is required");
        }
        const mcpServerUrl =
          process.env.MCP_SERVER_URL || "http://localhost:3001";
        return new GeminiService(apiKey, mcpServerUrl);
      },
    },
  ],
})
export class AppModule {}
