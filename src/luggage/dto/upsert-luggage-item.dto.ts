import { IsInt } from "class-validator";

export class UpsertLuggageItemDto {
  @IsInt()
  quantity: number;
}
