import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategory } from './entities/item-category.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterItemCategoryDto } from './dto/filter-item.dto';

@Injectable()
export class ItemCategoriesService {
  private readonly logger = new Logger('ItemService')

  constructor(
    @InjectRepository(ItemCategory)
    private readonly itemCategoryRepository: Repository<ItemCategory>,
  ){}

  async create(createItemCategoryDto: CreateItemCategoryDto) {
    try {
      const itemCategory = this.itemCategoryRepository.create(createItemCategoryDto)
      await this.itemCategoryRepository.save(itemCategory)
      return itemCategory

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(filterItemCategoryDto: FilterItemCategoryDto) {
    const { 
      limit = 10, 
      offset = 0,
      name,
      description
    } = filterItemCategoryDto

    const query = this.itemCategoryRepository.createQueryBuilder('item')

    if (name) query.andWhere('itemCategory.name ILIKE :name', { name: `%${name}%`})

    if (description) query.andWhere('itemCategory.description ILIKE :description', { description: `%${description}%`})

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const itemCategory = await this.itemCategoryRepository.findOneBy({ id })

    if (!itemCategory){
      throw new NotFoundException(`Item category with id ${id} not found`)
    }

    return itemCategory
  }

  async update(id: string, updateItemCategoryDto: UpdateItemCategoryDto) {
    const itemCategory = await this.itemCategoryRepository.preload({
      id,
      ...updateItemCategoryDto
    })

    if (!itemCategory){
      throw new NotFoundException(`Item category with id ${id} not found`)
    }

    try {
      await this.itemCategoryRepository.save(itemCategory)
      return itemCategory
    
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async remove(id: string) {
    const itemCategory = await this.itemCategoryRepository.findOneBy({ id })

    if (!itemCategory){
      throw new NotFoundException(`Item category with id ${id} not found`)
    }

    this.itemCategoryRepository.remove(itemCategory)
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
