import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LuggageCategoriesService } from './luggage-categories.service';
import { CreateLuggageCategoryDto } from './dto/create-luggage-category.dto';
import { UpdateLuggageCategoryDto } from './dto/update-luggage-category.dto';

@Controller('luggage-categories')
export class LuggageCategoriesController {
  constructor(private readonly luggageCategoriesService: LuggageCategoriesService) {}

  @Post()
  create(@Body() createLuggageCategoryDto: CreateLuggageCategoryDto) {
    return this.luggageCategoriesService.create(createLuggageCategoryDto);
  }

  @Get()
  findAll() {
    return this.luggageCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.luggageCategoriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLuggageCategoryDto: UpdateLuggageCategoryDto) {
    return this.luggageCategoriesService.update(+id, updateLuggageCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.luggageCategoriesService.remove(+id);
  }
}
