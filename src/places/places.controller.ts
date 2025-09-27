import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseFilters } from '@nestjs/common';
import { PlacesService } from './places.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { FilterPlaceDto } from './dto/filter-place.dto';
import { DatabaseExceptionFilter } from 'src/common/filters/db-exception.filter';

@UseFilters(new DatabaseExceptionFilter('Places'))
@Controller('trips/:tripId/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
    create(
      @Param('tripId', ParseUUIDPipe) tripId: string,
      @Body() dto: CreatePlaceDto
    ) {
      return this.placesService.create(tripId, dto);
    }
  
    @Get()
    findAll(
      @Param('tripId', ParseUUIDPipe) tripId: string,
      @Query() dto: FilterPlaceDto
    ) {
      return this.placesService.findAll(tripId, dto);
    }
  
    @Get(':id')
    findOne(
      @Param('tripId', ParseUUIDPipe) tripId: string,
      @Param('id', ParseUUIDPipe) id: string
    ) {
      return this.placesService.findOne(tripId, id);
    }
    
    @Patch(':id')
    update(
      @Param('tripId', ParseUUIDPipe) tripId: string,
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdatePlaceDto
    ) {
      return this.placesService.update(tripId, id, dto);
    }
    
    @Delete(':id')
    remove(
      @Param('tripId', ParseUUIDPipe) tripId: string,
      @Param('id', ParseUUIDPipe) id: string
    ) {
      return this.placesService.remove(tripId, id);
    }
}
