import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Idempotencia } from './idempotencia.entity';

@Injectable()
export class IdempotenciaService {
  constructor(
    @InjectRepository(Idempotencia)
    private readonly repo: Repository<Idempotencia>,
  ) {}

  async exists(key: string): Promise<boolean> {
    return !!(await this.repo.findOne({ where: { idempotencyKey: key } }));
  }

  async register(key: string, detalleId: number) {
    return this.repo.save({
      idempotencyKey: key,
      detallePedidoId: detalleId,
    });
  }
}
