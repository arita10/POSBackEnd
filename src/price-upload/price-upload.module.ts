import { Module } from '@nestjs/common';
import { PriceUploadController } from './price-upload.controller';
import { PriceUploadService } from './price-upload.service';

@Module({
  controllers: [PriceUploadController],
  providers: [PriceUploadService],
})
export class PriceUploadModule {}
