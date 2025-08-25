import { Module } from '@nestjs/common';
import { LuggageService } from './luggage.service';
import { LuggageController } from './luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage, LuggageCategory } from './entities';


@Module({
  controllers: [LuggageController],
  providers: [LuggageService],
  imports: [
    TypeOrmModule.forFeature([ Luggage, LuggageCategory ])
  ]
})
export class LuggageModule {}
