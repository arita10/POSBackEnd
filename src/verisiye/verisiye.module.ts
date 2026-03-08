import { Module } from '@nestjs/common';
import { VerisiyeController } from './verisiye.controller';
import { VerisiyeService } from './verisiye.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [VerisiyeController],
  providers: [VerisiyeService],
  exports: [VerisiyeService],
})
export class VerisiyeModule {}
