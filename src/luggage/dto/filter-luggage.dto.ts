import { IsEnum, IsOptional, IsString } from "class-validator"
import { PaginationDto } from "src/common/dto/pagination.dto"
import { LuggageType } from "../entities/luggage.entity"

export class FilterLuggageDto extends PaginationDto{
    @IsOptional()
    @IsString()
    name?: string

    @IsOptional()
    @IsEnum(LuggageType)
    type: LuggageType
}