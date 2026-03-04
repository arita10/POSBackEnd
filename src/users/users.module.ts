import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * @module UsersModule
 * @description Feature module for User management within shops.
 * PrismaService is available automatically via @Global() PrismaModule.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
