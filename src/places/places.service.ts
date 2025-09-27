import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Place } from './entities/place.entity';
import { Repository } from 'typeorm';
import { Trip } from 'src/trips/entities/trip.entity';
import { FilterPlaceDto } from './dto/filter-place.dto';

@Injectable()
export class PlacesService {

  constructor(
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,

    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ){}

  async create(tripId: string, dto: CreatePlaceDto) {
    const trip = await this.tripRepository.findOne({ where: { id: tripId } })

    if (!trip) {
      throw new NotFoundException(`Trip with id ${tripId} not found`)
    }

    const place = this.placeRepository.create({
      ...dto,
      trip
    })

    await this.placeRepository.save(place)
    return place
  }

  async findAll(tripId: string, dto: FilterPlaceDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      description,
    } = dto

    const query = this.placeRepository.createQueryBuilder('place')

    query.where('place.tripId = :tripId', { tripId });

    if (name) query.andWhere('place.name ILIKE :name', { name: `%${name}%`})
    
    if (description) query.andWhere('place.description ILIKE :description', { description: `%${description}%`})

    query.skip(offset).take(limit)

    return query.getMany()
  }
  
  async findOne(tripId: string, placeId: string) {
    const place = await this.placeRepository.findOne({
      where: {
        id: placeId,
        trip: { id: tripId },
      },
    });

    if (!place) {
      throw new NotFoundException(`Place with id ${placeId} not found in trip ${tripId}`);
    }

    return place;
  }

  async update(tripId: string, placeId: string, dto: UpdatePlaceDto) {
    const place = await this.placeRepository.preload({
      id: placeId,
      ...dto,
      trip: { id: tripId },
    });
    
    if (!place) {
      throw new NotFoundException(`Place with id ${placeId} not found in trip ${tripId}`);
    }
    
    await this.placeRepository.save(place);
    return place;
  }
  
  async remove(tripId: string, placeId: string) {
    const place = await this.placeRepository.findOne({
      where: {
        id: placeId,
        trip: { id: tripId },
      },
    });
    
    if (!place) {
      throw new NotFoundException(`Place with id ${placeId} not found in trip ${tripId}`);
    }
    
    try {
      await this.placeRepository.remove(place);
      return { message: 'Place removed successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Unexpected error, check server logs');
    }
  }
}
