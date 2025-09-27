import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LuggageCategory } from 'src/luggage-categories/entities/luggage-category.entity';
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

    @InjectRepository(LuggageCategory)
    private readonly luggageCategoryRepository: Repository<LuggageCategory>,

    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ){}

<<<<<<< HEAD
  async create(createLuggageDto: CreateLuggageDto) {
<<<<<<< HEAD
    try {
      const { categoryId, tripId, ...luggageData } = createLuggageDto
=======
    const { categoryId, ...luggageData } = createLuggageDto
>>>>>>> 18a7002 (Remove db filter handler from luggage service)
=======
  async create(dto: CreateLuggageDto) {
    const { categoryId, ...luggageData } = dto
>>>>>>> c827588 (Change DTO complex names to DTO on luggage service)

    const category = await this.luggageCategoryRepository.findOneBy({ id: categoryId })

    if (!category) throw new NotFoundException(`Category with id ${categoryId} not found`)

<<<<<<< HEAD
      let trip: Trip | null = null;
      if (tripId) {
        trip = await this.tripRepository.findOneBy({ id: tripId })

        if (!trip) throw new NotFoundException(`Trip with id ${tripId} not found`)
      }

      const luggage = this.luggageRepository.create({
        ...luggageData,
        category,
        ...(trip ? { trip } : {}),
      })
      
      await this.luggageRepository.save(luggage)
      return luggage

    } catch (error) {
      this.handleExceptions(error)
    }
=======
    const luggage = this.luggageRepository.create({
      ...luggageData,
      category
    })
    
    await this.luggageRepository.save(luggage)
    return luggage
>>>>>>> 18a7002 (Remove db filter handler from luggage service)
  }

  async findAll(dto: FilterLuggageDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      categoryId,
<<<<<<< HEAD
      tripId,
    } = filterLuggageDto
=======
    } = dto
>>>>>>> c827588 (Change DTO complex names to DTO on luggage service)

    const query = this.luggageRepository
                    .createQueryBuilder('luggage')
                    .leftJoinAndSelect('luggage.category', 'category')
                    .leftJoinAndSelect('luggage.trip', 'trip')

    if (name) query.andWhere('luggage.name ILIKE :name', { name: `%${name}%`})
    
    if (categoryId) query.andWhere('category.id = :categoryId', { categoryId})

    if (tripId) query.andWhere('trip.id = :tripId', { tripId })

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const luggage = await this.luggageRepository.findOne({
      where: { id },
      relations: {  category: true }
    })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    return luggage
  }

<<<<<<< HEAD
  async update(id: string, updateLuggageDto: UpdateLuggageDto) {
    const { categoryId, tripId, ...luggageData } = updateLuggageDto;
=======
  async update(id: string, dto: UpdateLuggageDto) {
    const { categoryId, ...luggageData } = dto;
>>>>>>> c827588 (Change DTO complex names to DTO on luggage service)

    let category: LuggageCategory | null = null;
    if (categoryId) {
      category = await this.luggageCategoryRepository.findOneBy({ id: categoryId })

      if (!category) throw new NotFoundException(`Category with id ${categoryId} not found`)
    }

    let trip: Trip | null = null;
    if (tripId) {
      trip = await this.tripRepository.findOneBy({ id: tripId })

      if (!trip) throw new NotFoundException(`Trip with id ${tripId} not found`)
    }

    const luggage = await this.luggageRepository.preload({
      id,
      ...luggageData,
      ...(category ? { category } : {}),
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
