import { IsEnum, IsNotEmpty, IsString } from "class-validator"
import { LuggageType } from "../entities/luggage.entity"


export class CreateLuggageDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsEnum(LuggageType)
    type: LuggageType
}
