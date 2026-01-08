import { ICliente } from "../domain/cliente";

const clientes: ICliente[] = [];

export class CrudCliente {
    constructor() {}

    crear(nuevoCliente: ICliente) {
        clientes.push(nuevoCliente);
    }

    actualizar(id: number, nuevoCliente: ICliente) {
        let idx = clientes.findIndex((cli) => cli.id === id);
        if (idx === -1) {
            console.log("No se ha encontrado el cliente");
            return;
        }
        clientes.splice(idx, 1, nuevoCliente);
    }

    borrar(id: number, callback_error: CallableFunction) {
        let msg: string | undefined;
        let msg_resolve: string | undefined;

        let idx = clientes.findIndex((cli) => cli.id === id);
        if (idx === -1) {
            msg = "No se ha encontrado el cliente";
        } else {
            clientes.splice(idx, 1);
            msg_resolve = "Se ha borrado el cliente";
        }
        callback_error(msg ?? msg_resolve);
    }

    consultar(id: number): ICliente {
        let cliente = clientes.find((cli) => cli.id === id);
        if (!cliente) {
            throw new Error("No se ha encontrado el cliente");
        }
        return cliente;
    }

    listar(): ICliente[] {
        return clientes;
    }
}
