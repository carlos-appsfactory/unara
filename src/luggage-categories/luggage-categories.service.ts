import { Injectable } from '@nestjs/common';
import { CreateLuggageCategoryDto } from './dto/create-luggage-category.dto';
import { UpdateLuggageCategoryDto } from './dto/update-luggage-category.dto';

@Injectable()
export class LuggageCategoriesService {
  create(createLuggageCategoryDto: CreateLuggageCategoryDto) {
    return 'This action adds a new luggageCategory';
  }

  findAll() {
    return `This action returns all luggageCategories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} luggageCategory`;
  }

  update(id: number, updateLuggageCategoryDto: UpdateLuggageCategoryDto) {
    return `This action updates a #${id} luggageCategory`;
  }

  remove(id: number) {
    return `This action removes a #${id} luggageCategory`;
  }
}
