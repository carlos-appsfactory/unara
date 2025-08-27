import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common"
import { Luggage } from "../entities/luggage.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Item } from "src/items/entities/item.entity"
import { UpsertLuggageItemDto } from "../dto/upsert-luggage-item.dto"

@Injectable()
export class LuggageItemsService {

  private readonly logger = new Logger('LuggageService')
  
  constructor(
    @InjectRepository(Luggage)
    private readonly luggageRepository: Repository<Luggage>,

    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ){}

  async upsert(luggageId: string, itemId: string, dto: UpsertLuggageItemDto) {
    return `This action updates a #${itemId} item for luggage #${luggageId}`;    
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
