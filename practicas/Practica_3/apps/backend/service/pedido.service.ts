import { IPedido } from "../domain/pedido";
import { ICliente } from "../domain/cliente";

// Base de datos en memoria con datos de ejemplo
const clientes: ICliente[] = [
    { id: 1, nombre: "Juan Pérez", telefono: "0991234567", direccion: "Av. Principal 123" },
    { id: 2, nombre: "María García", telefono: "0997654321", direccion: "Calle Secundaria 456" },
    { id: 3, nombre: "Carlos López", telefono: "0998765432", direccion: "Av. Central 789" },
];

const pedidos: IPedido[] = [
    { id_pedido: 1, cliente: clientes[0]!, fecha: new Date("2026-01-05"), estado: "pendiente" },
    { id_pedido: 2, cliente: clientes[0]!, fecha: new Date("2026-01-04"), estado: "entregado" },
    { id_pedido: 3, cliente: clientes[1]!, fecha: new Date("2026-01-06"), estado: "en proceso" },
];

export class PedidoService {
    
    crear(clienteId: number): IPedido | undefined {
        const cliente = clientes.find(c => c.id === clienteId);
        if (!cliente) return undefined;

        const nuevoPedido: IPedido = {
            id_pedido: pedidos.length + 1,
            cliente: cliente,
            fecha: new Date(),
            estado: "pendiente"
        };
        pedidos.push(nuevoPedido);
        return nuevoPedido;
    }

    listar(): IPedido[] {
        return pedidos;
    }

    consultar(id: number): IPedido | undefined {
        return pedidos.find((p) => p.id_pedido === id);
    }

    listarPorCliente(clienteId: number): IPedido[] {
        return pedidos.filter((p) => p.cliente.id === clienteId);
    }

    actualizarEstado(id: number, estado: IPedido["estado"]): IPedido | undefined {
        const pedido = this.consultar(id);
        if (!pedido) return undefined;
        
        pedido.estado = estado;
        return pedido;
    }

    borrar(id: number): boolean {
        const idx = pedidos.findIndex((p) => p.id_pedido === id);
        if (idx === -1) return false;
        
        pedidos.splice(idx, 1);
        return true;
    }
}

export class ClienteService {
    
    crear(cliente: ICliente): ICliente {
        clientes.push(cliente);
        return cliente;
    }

    listar(): ICliente[] {
        return clientes;
    }

    consultar(id: number): ICliente | undefined {
        return clientes.find((c) => c.id === id);
    }

    actualizar(id: number, clienteActualizado: Partial<ICliente>): ICliente | undefined {
        const idx = clientes.findIndex((c) => c.id === id);
        if (idx === -1) return undefined;
        
        const clienteExistente = clientes[idx]!;
        clientes[idx] = { 
            id: clienteExistente.id,
            nombre: clienteActualizado.nombre ?? clienteExistente.nombre,
            telefono: clienteActualizado.telefono ?? clienteExistente.telefono,
            direccion: clienteActualizado.direccion ?? clienteExistente.direccion
        };
        return clientes[idx];
    }

    borrar(id: number): boolean {
        const idx = clientes.findIndex((c) => c.id === id);
        if (idx === -1) return false;
        
        clientes.splice(idx, 1);
        return true;
    }
}
