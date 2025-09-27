import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, UseFilters } from '@nestjs/common';
import { LuggageService } from '../services/luggage.service';
import { CreateLuggageDto } from '../dto/create-luggage.dto';
import { UpdateLuggageDto } from '../dto/update-luggage.dto';
import { FilterLuggageDto } from '../dto/filter-luggage.dto';
import { DatabaseExceptionFilter } from 'src/common/filters/db-exception.filter';

@UseFilters(new DatabaseExceptionFilter('Luggage'))
@Controller('luggage')
export class LuggageController {
  constructor(private readonly luggageService: LuggageService) {}

  @Post()
  create(@Body() dto: CreateLuggageDto) {
    return this.luggageService.create(dto);
  }

  @Get()
  findAll(@Query() dto: FilterLuggageDto) {
    return this.luggageService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.luggageService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() dto: UpdateLuggageDto) {
    return this.luggageService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.luggageService.remove(id);
  }
}
