import { Module } from '@nestjs/common';
import { LuggageService } from './services/luggage.service';
import { LuggageController } from './controllers/luggage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Luggage } from './entities/luggage.entity';
import { LuggageCategoriesModule } from 'src/luggage-categories/luggage-categories.module';
import { LuggageItemsController } from './controllers/luggage-items.controller';
import { LuggageItemsService } from './services/luggage-items.service';
import { LuggageItem } from './entities/luggage-item.entity';
import { ItemsModule } from 'src/items/items.module';

@Module({
  controllers: [
    LuggageController,
    LuggageItemsController,
  ],
  providers: [
    LuggageService,
    LuggageItemsService,
  ],
  imports: [
    TypeOrmModule.forFeature([ 
      Luggage,
      LuggageItem
    ]),
    LuggageCategoriesModule,
    ItemsModule,
  ]
})
export class LuggageModule {}
