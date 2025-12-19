import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @Column()
  cantidad_solicitada: number;

  @Column('decimal', { precision: 10, scale: 2 })
  precio_unitario: number;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number;

  @Column()
  pedidoId: number;
}
