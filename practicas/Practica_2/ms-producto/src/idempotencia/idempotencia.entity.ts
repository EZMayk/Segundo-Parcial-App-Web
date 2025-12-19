import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Idempotencia {
  @PrimaryColumn()
  idempotencyKey: string;

  @Column()
  detallePedidoId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  processedAt: Date;
}
