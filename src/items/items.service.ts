import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Item } from './entities/item.entity';
import { Repository } from 'typeorm';
import { FilterItemDto } from './dto/filter-item.dto';
import { ItemCategory } from 'src/item-categories/entities/item-category.entity';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger('ItemsService')

  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(ItemCategory)
    private readonly itemCategoryRepository: Repository<ItemCategory>,
  ){}

  async create(createItemDto: CreateItemDto) {
      const { categoryId, ...itemData } = createItemDto

      const category = await this.itemCategoryRepository.findOneBy({ id: categoryId })

      if (!category) throw new NotFoundException(`Category with id ${categoryId} not found`)


    try {
      const item = this.itemRepository.create({
        ...itemData,
        category
      })

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
      name,
      categoryId,
    } = filterItemDto

    const query = this.itemRepository
                      .createQueryBuilder('item')
                      .leftJoinAndSelect('item.category', 'category')

    if (name) query.andWhere('item.name ILIKE :name', { name: `%${name}%`})

    if (categoryId) query.andWhere('category.id = :categoryId', { categoryId})

    query.skip(offset).take(limit)

    return query.getMany()
  }

  async findOne(id: string) {
    const item = await this.itemRepository.findOne({ 
      where: { id },
      relations: {  category: true }
    })

    if (!item){
      throw new NotFoundException(`Item with id ${id} not found`)
    }

    return item
  }

  async update(id: string, updateItemDto: UpdateItemDto) {
    const { categoryId, ...itemData } = updateItemDto;

    let category: ItemCategory | null = null;
    if (categoryId) {
      category = await this.itemCategoryRepository.findOneBy({ id: categoryId })

      if (!category) throw new NotFoundException(`Category with id ${categoryId} not found`)
    }

    const item = await this.itemRepository.preload({
      id,
      ...itemData,
      ...(category ? { category } : {}),
    })

    if (!item){
      throw new NotFoundException(`Item with id ${id} not found`)
    }

    try {
      await this.itemRepository.save(item)
      return item
    
    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async remove(id: string) {
    const item = await this.itemRepository.findOneBy({ id })

    if (!item){
      throw new NotFoundException(`Item with id ${id} not found`)
    }

    this.itemRepository.remove(item)
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
