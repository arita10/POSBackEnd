import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

/**
 * @module PermissionsModule
 * @description Feature module for user permission management.
 * PrismaService is available automatically via @Global() PrismaModule.
 */
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
