import { ICliente } from "./cliente";

export interface IPedido {
    id_pedido: number;
    cliente: ICliente;
    fecha: Date;
    estado: "pendiente" | "en proceso" | "entregado";
}