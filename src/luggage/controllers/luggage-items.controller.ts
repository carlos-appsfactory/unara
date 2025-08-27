import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { UpsertLuggageItemDto } from "../dto/upsert-luggage-item.dto";
import { LuggageItemsService } from "../services/luggage-items.service";

@Controller('luggage/:luggageId/items')
export class LuggageItemsController {
    constructor(private readonly luggageItemsService: LuggageItemsService) {}

    @Post(':itemId')
    upsert(
        @Param('luggageId', ParseUUIDPipe) luggageId: string, 
        @Param('itemId', ParseUUIDPipe) itemId: string, 
        @Body() dto: UpsertLuggageItemDto
    ) {
        return this.luggageItemsService.upsert(luggageId, itemId, dto);
    }
    
    @Get()
    findAll(@Param('luggageId', ParseUUIDPipe) luggageId: string) {
        return this.luggageItemsService.findAll(luggageId);
    }
    
    @Get(':itemId')
    findOne(
        @Param('luggageId', ParseUUIDPipe) luggageId: string,
        @Param('itemId', ParseUUIDPipe) itemId: string
    ) {
        return this.luggageItemsService.findOne(luggageId, itemId);
    }

    @Delete(':itemId')
    remove(
        @Param('luggageId') luggageId: string,
        @Param('itemId') itemId: string
    ) {
        return this.luggageItemsService.remove(luggageId, itemId);
    }
}
