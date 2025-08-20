import { Module } from '@nestjs/common';
import { LuggageService } from './luggage.service';
import { LuggageController } from './luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage } from './entities/luggage.entity';


@Module({
  controllers: [LuggageController],
  providers: [LuggageService],
  imports: [
    TypeOrmModule.forFeature([ Luggage ])
  ]
})
export class LuggageModule {}
