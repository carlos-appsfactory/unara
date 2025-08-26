import { Module } from '@nestjs/common';
import { LuggageCategoriesService } from './luggage-categories.service';
import { LuggageCategoriesController } from './luggage-categories.controller';

@Module({
  controllers: [LuggageCategoriesController],
  providers: [LuggageCategoriesService],
})
export class LuggageCategoriesModule {}
