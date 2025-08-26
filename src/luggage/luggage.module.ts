import { Module } from '@nestjs/common';
import { LuggageService } from './luggage.service';
import { LuggageController } from './luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage } from './entities/luggage.entity';
import { LuggageCategoriesModule } from 'src/luggage-categories/luggage-categories.module';


@Module({
  controllers: [LuggageController],
  providers: [LuggageService],
  imports: [
    TypeOrmModule.forFeature([ Luggage ]),
    LuggageCategoriesModule
  ]
})
export class LuggageModule {}
