import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity';
import { Repository } from 'typeorm';
import { FilterTripDto } from './dto/filter-trip.dto';

@Injectable()
export class TripsService {

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>
  ){}

  async create(dto: CreateTripDto) {
    const trip = this.tripRepository.create(dto)
    await this.tripRepository.save(trip)
    return trip
  }

  async findAll(dto: FilterTripDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      description, 
      destination,
      startDate,
      endDate
    } = dto

    const query = this.tripRepository.createQueryBuilder('trip')

    if (name) query.andWhere('trip.name ILIKE :name', { name: `%${name}%`})

    if (description) query.andWhere('trip.description ILIKE :description', { description: `%${description}%`})

    if (destination) query.andWhere('trip.destination ILIKE :destination', { destination: `%${destination}%`})
    
    if (startDate) query.andWhere('trip.startDate >= :startDate', { startDate });

    if (endDate) query.andWhere('trip.endDate <= :endDate', { endDate });

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const trip = await this.tripRepository.findOneBy({ id })

    if (!trip){
      throw new NotFoundException(`Trip with id ${id} not found`)
    }

    return trip
  }

  async update(id: string, dto: UpdateTripDto) {
    const trip = await this.tripRepository.preload({
      id,
      ...dto
    })

    if (!trip){
      throw new NotFoundException(`Trip with id ${id} not found`)
    }

    await this.tripRepository.save(trip)
    return trip
  }

  async remove(id: string) {
    const trip = await this.tripRepository.findOneBy({ id })

    if (!trip){
      throw new NotFoundException(`Trip with id ${id} not found`)
    }

    this.tripRepository.remove(trip)
  }
}
