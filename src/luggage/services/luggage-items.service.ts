import { Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common"
import { Luggage } from "../entities/luggage.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Item } from "src/items/entities/item.entity"
import { UpsertLuggageItemDto } from "../dto/upsert-luggage-item.dto"
import { LuggageItem } from "../entities/luggage-item.entity"

@Injectable()
export class LuggageItemsService {

  private readonly logger = new Logger('LuggageService')
  
  constructor(
    @InjectRepository(Luggage)
    private readonly luggageRepository: Repository<Luggage>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,

    @InjectRepository(LuggageItem)
    private readonly luggageItemRepository: Repository<LuggageItem>,
  ){}

  async upsert(luggageId: string, itemId: string, dto: UpsertLuggageItemDto) {
    const luggage = await this.luggageRepository.findOne({ where: { id: luggageId } })
    if (!luggage) {
      throw new NotFoundException(`Luggage with id ${luggageId} not found`)
    }

    const item = await this.itemRepository.findOne({ where: { id: itemId } })
    if (!item) {
      throw new NotFoundException(`Item with id ${itemId} not found`)
    }

    try{
      const updateResult = await this.luggageItemRepository
                                     .createQueryBuilder()
                                     .update(LuggageItem)
                                     .set({ quantity: dto.quantity })
                                     .where('luggageId = :luggageId AND itemId = :itemId', { luggageId, itemId })
                                     .execute()
                                     
      if (updateResult.affected === 0) {
        await this.luggageItemRepository
                  .createQueryBuilder()
                  .insert()
                  .into(LuggageItem)
                  .values({
                    luggage: { id: luggageId },
                    item: { id: itemId },
                    quantity: dto.quantity,
                  })
                  .execute();
      }
      
      return await this.luggageItemRepository
                       .createQueryBuilder('li')
                       .leftJoinAndSelect('li.item', 'item')
                       .where('li.luggageId = :luggageId AND li.itemId = :itemId', { luggageId, itemId })
                       .getOne();

    } catch (error) {
      this.handleExceptions(error)
    }
  }

  async findAll(luggageId: string) {
    return `This action returns all items for luggage #${luggageId}`;
  }

  async findOne(luggageId: string, itemId: string) {
    return `This action returns item #${itemId} for luggage #${luggageId}`;
  }

  async remove(luggageId: string,itemId: string) {
    return `This action removes item #${itemId} for luggage #${luggageId}`;
  }

  private handleExceptions(error: any){
    // TODO: Añadir los códigos de error que veamos que se van dando
    // if (error.code === 0) throw new BadRequestException(error.detail)

    this.logger.error(error)

    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
}
