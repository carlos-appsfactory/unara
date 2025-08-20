import { PartialType } from '@nestjs/mapped-types';
import { CreateLuggageDto } from './create-luggage.dto';

export class UpdateLuggageDto extends PartialType(CreateLuggageDto) {}
