import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Luggage } from '../entities/luggage.entity';
import { CreateLuggageDto } from '../dto/create-luggage.dto';
import { FilterLuggageDto } from '../dto/filter-luggage.dto';
import { UpdateLuggageDto } from '../dto/update-luggage.dto';
import { Trip } from 'src/trips/entities/trip.entity';

@Injectable()
export class LuggageService {
  
  constructor(
    @InjectRepository(Luggage)
    private readonly luggageRepository: Repository<Luggage>,

    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ){}


  async create(dto: CreateLuggageDto) {
    const luggage = this.luggageRepository.create({
      ...dto
    })
    
    await this.luggageRepository.save(luggage)
    return luggage
  }

  async findAll(dto: FilterLuggageDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      tripId,
    } = dto

    const query = this.luggageRepository
                    .createQueryBuilder('luggage')

    if (name) query.andWhere('luggage.name ILIKE :name', { name: `%${name}%`})

    if (tripId) query.andWhere('trip.id = :tripId', { tripId })

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const luggage = await this.luggageRepository.findOne({
      where: { id }
    })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    return luggage
  }

  async update(id: string, updateLuggageDto: UpdateLuggageDto) {
    const { tripId, ...luggageData } = updateLuggageDto;

    let trip: Trip | null = null;
    if (tripId) {
      trip = await this.tripRepository.findOneBy({ id: tripId })

      if (!trip) throw new NotFoundException(`Trip with id ${tripId} not found`)
    }

    const luggage = await this.luggageRepository.preload({
      id,
      ...luggageData,
      ...(trip ? { trip } : {}),
    })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    await this.luggageRepository.save(luggage)
    return luggage
  }

  async remove(id: string) {
    const luggage = await this.luggageRepository.findOneBy({ id: id })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    this.luggageRepository.remove(luggage)
  }
}
