import { Module } from '@nestjs/common';
import { VerisiyeController } from './verisiye.controller';
import { VerisiyeService } from './verisiye.service';

@Module({
  controllers: [VerisiyeController],
  providers: [VerisiyeService],
  exports: [VerisiyeService],
})
export class VerisiyeModule {}
