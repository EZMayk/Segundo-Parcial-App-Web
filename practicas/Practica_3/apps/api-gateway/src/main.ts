import * as dotenv from "dotenv";
dotenv.config(); // Cargar variables de entorno antes de todo

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 3000;

  app.enableCors();

  await app.listen(PORT);
  console.log(`🚀 API Gateway listening on http://localhost:${PORT}`);
  console.log(
    `📡 MCP Server: ${process.env.MCP_SERVER_URL || "http://localhost:3001"}`
  );
}

bootstrap().catch((error) => {
  console.error("Failed to start API Gateway:", error);
  process.exit(1);
});
