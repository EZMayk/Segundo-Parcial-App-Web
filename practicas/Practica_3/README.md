# Practica 3 - Microservicios con MCP + Gemini AI

Sistema de 3 componentes integrados:

- **Backend**: Servicio REST con CRUD en puerto 3002
- **MCP Server**: Servidor JSON-RPC con 3 Tools en puerto 3001
- **API Gateway**: Orquestador con Gemini AI en puerto 3000

---

## 📋 Estructura del Proyecto

```
Practica_3/
├── apps/
│   ├── backend/              # Servicio REST (NestJS)
│   ├── mcp-server/           # Servidor MCP (Express + JSON-RPC)
│   └── api-gateway/          # Gateway con Gemini (NestJS)
├── docker-compose.yml        # (Opcional para producción)
└── README.md                 # Este archivo
```

---

## 🚀 Instalación y Ejecución

### Paso 0: Instalar dependencias en los 3 servicios

Abre **3 terminales diferentes**. En cada una, navega a su carpeta e instala:

**Terminal 1 - Backend:**

```bash
cd apps/backend
npm install
```

**Terminal 2 - MCP Server:**

```bash
cd apps/mcp-server
npm install
```

**Terminal 3 - API Gateway:**

```bash
cd apps/api-gateway
npm install
```

---

## ▶️ Ejecutar el Sistema (Paso a Paso)

Mantén las **3 terminales abiertas** mientras ejecutas los comandos.

### Terminal 1: Backend (Puerto 3002)

```bash
cd apps/backend
npm run dev
```

**✓ Esperado:** Ver logs indicando que el servidor está escuchando en puerto 3002:

```
Se han listado todos los clientes
Server running on http://localhost:3002
```

---

### Terminal 2: MCP Server (Puerto 3001)

```bash
cd apps/mcp-server
npm run dev
```

**✓ Esperado:** Ver logs indicando que el servidor JSON-RPC está activo:

```
MCP Server running on port 3001
```

---

### Terminal 3: API Gateway (Puerto 3000)

```bash
cd apps/api-gateway
npm run start:dev
```

**✓ Esperado:** Ver logs de NestJS indicando que está escuchando en puerto 3000:

```
[NestFactory] Starting Nest application...
Nest application successfully started on port 3000
```

---

## ✅ Verificación: Health Checks

Una vez que los 3 servicios estén corriendo, abre **una 4ta terminal** y prueba:

```bash
# Health Check Backend
curl http://localhost:3002/health

# Health Check MCP Server
curl http://localhost:3001/health

# Health Check API Gateway
curl http://localhost:3000/api/health
```

**✓ Esperado en cada uno:**

```json
{ "status": "ok" }
```

---

## 🧪 Prueba End-to-End: POST /api/procesar

Envía un request al API Gateway (con curl o Postman):

```bash
curl -X POST http://localhost:3000/api/procesar \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Crear un detalle de pedido para el cliente 1, pedido 1, producto 1 con cantidad 5"
  }'
```

**✓ Flujo esperado:**

1. API Gateway recibe el request
2. Llama al MCP Server listando los 3 Tools disponibles
3. Envía el texto a Gemini AI con los Tools
4. Gemini decide qué Tools ejecutar
5. API Gateway ejecuta esos Tools contra el Backend
6. Retorna los resultados consolidados

**✓ Ejemplo de respuesta:**

```json
{
  "response": "Se ha creado exitosamente el detalle de pedido...",
  "tools_executed": [
    { "name": "buscar_pedido", "result": {...} },
    { "name": "crear_detalle_pedido", "result": {...} }
  ]
}
```

---

## ⚠️ Solución de Problemas

### Puerto ya en uso

Si ves `EADDRINUSE: address already in use :::3001`

```bash
# Matar procesos en ese puerto
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
lsof -ti:3000 | xargs kill -9

# Reintentar npm run dev
```

### `npm run dev` no inicia

Verifica que exista `tsconfig.json` y que las rutas en `package.json` sean correctas:

- Backend: `"dev": "tsnd --respawn --clear app.ts"`
- MCP Server: `"dev": "ts-node src/server.ts"`
- API Gateway: `"start:dev": "nest start --watch"`

### Gemini retorna error de API Key

Es normal si no has configurado la API Key. Ver sección "Falta para 100%" abajo.

---

## 🔄 Arquitectura del Flujo

```
User Request
    ↓
API Gateway (3000)
    ├→ MCPClient: Lista Tools del MCP Server
    ├→ Gemini: Procesa request + Tools disponibles
    ├→ MCPClient: Ejecuta Tools (función_calling)
    │   ├→ MCP Server (3001)
    │   │   ├→ buscar_pedido (GET Backend /clientes/:id)
    │   │   ├→ validar_disponibilidad (GET Backend /productos/:id)
    │   │   └→ crear_detalle_pedido (POST Backend /detalles)
    │   └→ Backend (3002) - CRUD en memoria
    └→ Retorna respuesta consolidada
```

---

## 🛠️ API Endpoints Principales

### Backend (3002)

- `GET /health` - Health check
- `GET /clientes` - Listar clientes
- `POST /clientes` - Crear cliente
- `GET /pedidos/:id` - Obtener pedido
- `POST /detalles` - Crear detalle de pedido
- `GET /productos/:id` - Obtener producto

### MCP Server (3001)

- `POST /rpc` - JSON-RPC 2.0 endpoint
  - `tools/listTools()` - Lista los 3 Tools
  - `tools/call(toolName, args)` - Ejecuta un Tool

### API Gateway (3000)

- `GET /api/health` - Health check
- `POST /api/procesar` - Procesa request con Gemini + Tools

---

## 📝 Qué Falta para estar al 100%

### 1. Configurar Gemini API Key Real ⚠️

Actualmente usa una clave fake. Para funcionar completo:

1. Ir a [Google AI Studio](https://aistudio.google.com/apikey)
2. Crear una API Key gratuita
3. Actualizar en `apps/api-gateway/.env`:
   ```
   GEMINI_API_KEY=tu_clave_real_aqui
   ```

### 2. Base de Datos Persistente

- Actualmente: Datos en memoria (se pierden al reiniciar)
- Falta: Integrar SQLite o PostgreSQL en Backend

### 3. Autenticación y Autorización

- Falta: JWT o similares entre servicios
- Falta: Rate limiting en API Gateway

### 4. Tests Unitarios e Integración

- Falta: Jest para Backend, MCP Server, API Gateway
- Falta: E2E tests con Postman/Newman

### 5. Logging y Monitoreo

- Falta: Winston o Pino para logs estructurados
- Falta: Métricas (Prometheus, datadog)

### 6. Documentación OpenAPI/Swagger

- Falta: @nestjs/swagger en API Gateway
- Falta: OpenAPI spec para Backend

### 7. Docker y Compose

- Existe: `docker-compose.yml` en raíz
- Falta: Dockerfile en cada app
- Falta: Probar `docker-compose up`

### 8. Variables de Entorno

- `.env` archivos no están en git (por `.gitignore`)
- Falta: Documentación de .env.example

### 9. Validaciones Avanzadas

- Falta: Joi/class-validator en Backend para inputs
- Falta: Error handling robusto

### 10. CI/CD

- Falta: GitHub Actions o similares
- Falta: Automatizar tests y builds

---

## 📚 Archivos Clave

| Archivo                                         | Descripción             |
| ----------------------------------------------- | ----------------------- |
| `apps/backend/app.ts`                           | Entrada del Backend     |
| `apps/backend/service/servicio.ts`              | Lógica CRUD             |
| `apps/mcp-server/src/server.ts`                 | Servidor MCP + JSON-RPC |
| `apps/mcp-server/src/tools/registry.ts`         | Definición de Tools     |
| `apps/api-gateway/src/main.ts`                  | Bootstrap NestJS        |
| `apps/api-gateway/src/gemini/gemini.service.ts` | Integración Gemini      |
| `apps/api-gateway/src/mcp-client/client.ts`     | Cliente MCP             |

---

## 🎯 Checklist de Entrega

- [x] Backend funciona en puerto 3002
- [x] MCP Server funciona en puerto 3001 con 3 Tools
- [x] API Gateway funciona en puerto 3000 con Gemini
- [x] Flujo End-to-End comprobado
- [x] Health checks en los 3 servicios
- [x] Código TypeScript compila sin errores
- [x] .gitignore configurado
- [x] README con instrucciones claras
- [ ] **Pendiente**: Gemini API Key real (ver "Qué Falta")
- [ ] **Pendiente**: Tests documentados con Postman

---

## 👥 Próximos Pasos para Compañeros

Si persisten problemas al ejecutar:

1. **Revisar versiones de Node:**

   ```bash
   node --version  # Debe ser 18+
   npm --version   # Debe ser 9+
   ```

2. **Limpiar node_modules y reinstalar:**

   ```bash
   cd apps/backend && rm -rf node_modules && npm install
   cd ../mcp-server && rm -rf node_modules && npm install
   cd ../api-gateway && rm -rf node_modules && npm install
   ```

3. **Verificar que puerto 3000, 3001, 3002 estén libres:**

   ```bash
   netstat -tuln | grep -E "3000|3001|3002"
   ```

4. **Contactar al equipo si:** Compilación falla, puertos conflictivos persisten, Gemini retorna errores con clave real.

---

**Versión**: 1.0  
**Fecha**: 6 de Enero 2026  
**Estado**: 90% Completo - Listo para demo
