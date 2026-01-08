import { IProducto } from "../domain/producto";

// Base de datos en memoria
const productos: IProducto[] = [
    { id: 1, nombre: "Chifle de Sal", precio: 2.50, stock: 100 },
    { id: 2, nombre: "Chifle de Dulce", precio: 2.75, stock: 80 },
    { id: 3, nombre: "Chifle Picante", precio: 3.00, stock: 50 },
    { id: 4, nombre: "Chifle Mix", precio: 3.50, stock: 60 },
];

export class ProductoService {
    
    crear(producto: IProducto): IProducto {
        productos.push(producto);
        return producto;
    }

    listar(): IProducto[] {
        return productos;
    }

    consultar(id: number): IProducto | undefined {
        return productos.find((p) => p.id === id);
    }

    actualizar(id: number, productoActualizado: Partial<IProducto>): IProducto | undefined {
        const idx = productos.findIndex((p) => p.id === id);
        if (idx === -1) return undefined;
        
        const productoExistente = productos[idx]!;
        productos[idx] = { 
            id: productoExistente.id,
            nombre: productoActualizado.nombre ?? productoExistente.nombre,
            precio: productoActualizado.precio ?? productoExistente.precio,
            stock: productoActualizado.stock ?? productoExistente.stock
        };
        return productos[idx];
    }

    reducirStock(id: number, cantidad: number): boolean {
        const producto = this.consultar(id);
        if (!producto || producto.stock < cantidad) {
            return false;
        }
        producto.stock -= cantidad;
        return true;
    }

    borrar(id: number): boolean {
        const idx = productos.findIndex((p) => p.id === id);
        if (idx === -1) return false;
        
        productos.splice(idx, 1);
        return true;
    }
}
