import { Module } from '@nestjs/common';
import { LuggageService } from './services/luggage.service';
import { LuggageController } from './controllers/luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage } from './entities/luggage.entity';
import { LuggageCategoriesModule } from 'src/luggage-categories/luggage-categories.module';
import { LuggageItemsController } from './controllers/luggage-items.controller';


@Module({
  controllers: [
    LuggageController,
    LuggageItemsController,
  ],
  providers: [LuggageService],
  imports: [
    TypeOrmModule.forFeature([ Luggage ]),
    LuggageCategoriesModule
  ]
})
export class LuggageModule {}
