import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class UpsertLuggageItemDto {
  @IsInt()
  @Type(() => Number)
  quantity: number;
}
