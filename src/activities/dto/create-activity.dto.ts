import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateActivityDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string

    @IsOptional()
    @IsString()
    description?: string

    @IsDate()
    @Type(() => Date)
    date: string

    @IsUUID()
    @IsNotEmpty()
    tripId: string

    @IsOptional()
    @IsUUID()
    @IsNotEmpty()
    placeId?: string
}
