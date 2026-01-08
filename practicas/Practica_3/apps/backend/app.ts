import express from "express";
import cors from "cors";
import { ProductoService } from "./service/producto.service";
import { PedidoService, ClienteService } from "./service/pedido.service";
import { DetallePedidoService } from "./service/detalle-pedido.service";

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Instanciar servicios
const productoService = new ProductoService();
const pedidoService = new PedidoService();
const clienteService = new ClienteService();
const detallePedidoService = new DetallePedidoService(pedidoService, productoService);

// ==================== RUTAS DE PRODUCTOS ====================

// GET /producto/buscar - Buscar productos por nombre
app.get("/producto/buscar", (req, res) => {
    const nombre = req.query.nombre as string;
    if (!nombre) {
        return res.json(productoService.listar());
    }
    const productos = productoService.listar().filter(p => 
        p.nombre.toLowerCase().includes(nombre.toLowerCase())
    );
    res.json(productos);
});

// GET /producto - Listar todos los productos
app.get("/producto", (req, res) => {
    const productos = productoService.listar();
    res.json(productos);
});

// GET /producto/:id - Obtener producto por ID
app.get("/producto/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const producto = productoService.consultar(id);
    
    if (!producto) {
        return res.status(404).json({ error: `Producto ${id} no encontrado` });
    }
    res.json(producto);
});

// POST /producto - Crear producto
app.post("/producto", (req, res) => {
    const producto = productoService.crear(req.body);
    res.status(201).json(producto);
});

// ==================== RUTAS DE PEDIDOS ====================

// GET /pedido/buscar - Buscar pedidos por nombre de cliente
app.get("/pedido/buscar", (req, res) => {
    const nombreCliente = req.query.nombre_cliente as string;
    if (!nombreCliente) {
        return res.json(pedidoService.listar());
    }
    const pedidos = pedidoService.listar().filter(p => 
        p.cliente.nombre.toLowerCase().includes(nombreCliente.toLowerCase())
    );
    res.json(pedidos);
});

// GET /pedido - Listar todos los pedidos
app.get("/pedido", (req, res) => {
    const pedidos = pedidoService.listar();
    res.json(pedidos);
});

// GET /pedido/:id - Obtener pedido por ID
app.get("/pedido/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const pedido = pedidoService.consultar(id);
    
    if (!pedido) {
        return res.status(404).json({ error: `Pedido ${id} no encontrado` });
    }
    res.json(pedido);
});

// POST /pedido - Crear pedido para un cliente
app.post("/pedido", (req, res) => {
    const { cliente_id } = req.body;
    const pedido = pedidoService.crear(cliente_id);
    
    if (!pedido) {
        return res.status(400).json({ error: `Cliente ${cliente_id} no encontrado` });
    }
    res.status(201).json(pedido);
});

// PUT /pedido/:id/estado - Actualizar estado del pedido
app.put("/pedido/:id/estado", (req, res) => {
    const id = parseInt(req.params.id);
    const { estado } = req.body;
    const pedido = pedidoService.actualizarEstado(id, estado);
    
    if (!pedido) {
        return res.status(404).json({ error: `Pedido ${id} no encontrado` });
    }
    res.json(pedido);
});

// ==================== RUTAS DE CLIENTES ====================

// GET /cliente - Listar todos los clientes
app.get("/cliente", (req, res) => {
    const clientes = clienteService.listar();
    res.json(clientes);
});

// GET /cliente/:id - Obtener cliente por ID
app.get("/cliente/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const cliente = clienteService.consultar(id);
    
    if (!cliente) {
        return res.status(404).json({ error: `Cliente ${id} no encontrado` });
    }
    res.json(cliente);
});

// GET /cliente/:id/pedidos - Obtener pedidos de un cliente
app.get("/cliente/:id/pedidos", (req, res) => {
    const id = parseInt(req.params.id);
    const cliente = clienteService.consultar(id);
    
    if (!cliente) {
        return res.status(404).json({ error: `Cliente ${id} no encontrado` });
    }
    
    const pedidos = pedidoService.listarPorCliente(id);
    res.json(pedidos);
});

// POST /cliente - Crear cliente
app.post("/cliente", (req, res) => {
    const cliente = clienteService.crear(req.body);
    res.status(201).json(cliente);
});

// ==================== RUTAS DE DETALLE PEDIDO ====================

// GET /detalle_pedido - Listar todos los detalles
app.get("/detalle_pedido", (req, res) => {
    const detalles = detallePedidoService.listar();
    res.json(detalles);
});

// GET /detalle_pedido/:id - Obtener detalle por ID
app.get("/detalle_pedido/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const detalle = detallePedidoService.consultar(id);
    
    if (!detalle) {
        return res.status(404).json({ error: `Detalle ${id} no encontrado` });
    }
    res.json(detalle);
});

// GET /pedido/:id/detalles - Obtener detalles de un pedido
app.get("/pedido/:id/detalles", (req, res) => {
    const id = parseInt(req.params.id);
    const detalles = detallePedidoService.listarPorPedido(id);
    res.json(detalles);
});

// POST /detalle_pedido - Crear detalle de pedido
app.post("/detalle_pedido", (req, res) => {
    const { pedido_id, producto_id, cantidad } = req.body;
    const resultado = detallePedidoService.crear(pedido_id, producto_id, cantidad);
    
    if ("error" in resultado) {
        return res.status(400).json(resultado);
    }
    res.status(201).json(resultado);
});

// ==================== HEALTH CHECK ====================

app.get("/health", (req, res) => {
    res.json({ status: "Backend running", port: PORT });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`🚀 Backend listening on http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   GET  /producto, /producto/:id`);
    console.log(`   GET  /pedido, /pedido/:id`);
    console.log(`   GET  /cliente, /cliente/:id, /cliente/:id/pedidos`);
    console.log(`   POST /detalle_pedido`);
    console.log(`   GET  /health`);
});