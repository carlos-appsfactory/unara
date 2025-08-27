import { IsInt, IsUUID, Min } from "class-validator";

export class UpdateLuggageItemDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
