import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator"


export class CreateLuggageDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @IsUUID()
    @IsOptional()
    tripId?: string
}
