import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { Repository } from 'typeorm';
import { FilterItemDto } from './dto/filter-item.dto';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger('ItemsService')

  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>
  ){}

  async create(createItemDto: CreateItemDto) {
    try {
      const item = this.itemRepository.create(createItemDto)
      await this.itemRepository.save(item)
      return item

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(filterItemDto: FilterItemDto) {
    const { 
      limit = 10, 
      offset = 0,
      name
    } = filterItemDto

    const query = this.itemRepository.createQueryBuilder('item')

    if (name) query.andWhere('item.name ILIKE :name', { name: `%${name}%`})

    query.skip(offset).take(limit)

    return query.getMany()
  }

  findOne(id: number) {
    return `This action returns a #${id} item`;
  }

  update(id: number, updateItemDto: UpdateItemDto) {
    return `This action updates a #${id} item`;
  }

  remove(id: number) {
    return `This action removes a #${id} item`;
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
