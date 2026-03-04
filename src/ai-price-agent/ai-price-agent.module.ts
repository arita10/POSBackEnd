import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AiPriceAgentController } from './ai-price-agent.controller';
import { AiPriceAgentService } from './ai-price-agent.service';

/**
 * @module AiPriceAgentModule
 * @description Feature module for the AI price comparison agent.
 * Imports ScheduleModule to enable @Cron decorators.
 *
 * The ScheduleModule.forRoot() registers the cron scheduler globally.
 * This is the standard NestJS way to use cron jobs.
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AiPriceAgentController],
  providers: [AiPriceAgentService],
})
export class AiPriceAgentModule {}
