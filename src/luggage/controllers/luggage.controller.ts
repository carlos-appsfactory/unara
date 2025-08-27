import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { LuggageService } from '../services/luggage.service';
import { CreateLuggageDto } from '../dto/create-luggage.dto';
import { UpdateLuggageDto } from '../dto/update-luggage.dto';
import { FilterLuggageDto } from '../dto/filter-luggage.dto';

@Controller('luggage')
export class LuggageController {
  constructor(private readonly luggageService: LuggageService) {}

  @Post()
  create(@Body() createLuggageDto: CreateLuggageDto) {
    return this.luggageService.create(createLuggageDto);
  }

  @Get()
  findAll(@Query() filterLuggageDto: FilterLuggageDto) {
    return this.luggageService.findAll(filterLuggageDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.luggageService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateLuggageDto: UpdateLuggageDto) {
    return this.luggageService.update(id, updateLuggageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.luggageService.remove(id);
  }
}
