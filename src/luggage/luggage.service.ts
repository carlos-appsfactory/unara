import { Injectable } from '@nestjs/common';
import { CreateLuggageDto } from './dto/create-luggage.dto';
import { UpdateLuggageDto } from './dto/update-luggage.dto';

@Injectable()
export class LuggageService {
  create(createLuggageDto: CreateLuggageDto) {
    return 'This action adds a new luggage';
  }

  findAll() {
    return `This action returns all luggage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} luggage`;
  }

  update(id: number, updateLuggageDto: UpdateLuggageDto) {
    return `This action updates a #${id} luggage`;
  }

  remove(id: number) {
    return `This action removes a #${id} luggage`;
  }
}
