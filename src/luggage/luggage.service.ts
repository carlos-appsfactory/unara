import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateLuggageDto } from './dto/create-luggage.dto';
import { UpdateLuggageDto } from './dto/update-luggage.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Luggage } from './entities/luggage.entity';

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

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
