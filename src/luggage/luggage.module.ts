import { Module } from '@nestjs/common';
import { LuggageService } from './luggage.service';
import { LuggageController } from './luggage.controller';

@Module({
  controllers: [LuggageController],
  providers: [LuggageService],
})
export class LuggageModule {}
