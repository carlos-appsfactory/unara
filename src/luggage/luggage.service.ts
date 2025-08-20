import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateLuggageDto } from './dto/create-luggage.dto';
import { UpdateLuggageDto } from './dto/update-luggage.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Luggage } from './entities/luggage.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { FilterLuggageDto } from './dto/filter-luggage.dto';

@Injectable()
export class LuggageService {

  private readonly logger = new Logger('LuggageService')
  
  constructor(
    @InjectRepository(Luggage)
    private readonly luggageRepository: Repository<Luggage>
  ){}

  async create(createLuggageDto: CreateLuggageDto) {
    try {
      const luggage = this.luggageRepository.create(createLuggageDto)
      await this.luggageRepository.save(luggage)
      return luggage

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(filterLuggageDto: FilterLuggageDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      type,
    } = filterLuggageDto

    const query = this.luggageRepository.createQueryBuilder('luggage')

    if (name) query.andWhere('luggage.name ILIKE :name', { name: `%${name}%`})
    
    if (type) query.andWhere('luggage.type = :type', { type: type})

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const luggage = await this.luggageRepository.findOneBy({ id: id })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    return luggage
  }

  update(id: number, updateLuggageDto: UpdateLuggageDto) {
    return `This action updates a #${id} luggage`;
  }

  async remove(id: string) {
    const luggage = await this.luggageRepository.findOneBy({ id: id })

    if (!luggage){
      throw new NotFoundException(`Luggage with id ${id} not found`)
    }

    this.luggageRepository.remove(luggage)
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
