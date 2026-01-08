import { IPedido } from "./pedido";
import { IChifle } from "./chifle";

export interface Detalle_Pedido {
    id_detalle: number;
    pedido: IPedido;
    chicle: IChifle;
    cantidad_en_fundas: number;
}