import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Trip } from './entities/trip.entity';
import { Repository } from 'typeorm';
import { FilterTripDto } from './dto/filter-trip.dto';

@Injectable()
export class TripsService {

  private readonly logger = new Logger('TripsService')

  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>
  ){}

  async create(createTripDto: CreateTripDto) {
    try {
      const trip = this.tripRepository.create(createTripDto)
      await this.tripRepository.save(trip)
      return trip

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(filterTripDto: FilterTripDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      description, 
      destination,
      startDate,
      endDate
    } = filterTripDto

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

  async update(id: string, updateTripDto: UpdateTripDto) {
    const trip = await this.tripRepository.preload({
      id,
      ...updateTripDto
    })

    if (!trip){
      throw new NotFoundException(`Trip with id ${id} not found`)
    }

    try {
      await this.tripRepository.save(trip)
      return trip
    
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async remove(id: string) {
    const trip = await this.tripRepository.findOneBy({ id })

    if (!trip){
      throw new NotFoundException(`Trip with id ${id} not found`)
    }

    this.tripRepository.remove(trip)
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
