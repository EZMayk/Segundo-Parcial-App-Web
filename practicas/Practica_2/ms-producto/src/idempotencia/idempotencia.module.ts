import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Idempotencia } from './idempotencia.entity';
import { IdempotenciaService } from './idempotencia.service';

@Module({
  imports: [TypeOrmModule.forFeature([Idempotencia])],
  providers: [IdempotenciaService],
  exports: [IdempotenciaService],
})
export class IdempotenciaModule {}
