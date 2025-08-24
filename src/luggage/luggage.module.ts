import { Module } from '@nestjs/common';
import { LuggageService } from './luggage.service';
import { LuggageController } from './luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage } from './entities/luggage.entity';
import { LuggageCategory } from './entities/luggage-category.entity';


@Module({
  controllers: [LuggageController],
  providers: [LuggageService],
  imports: [
    TypeOrmModule.forFeature([ Luggage, LuggageCategory ])
  ]
})
export class LuggageModule {}
