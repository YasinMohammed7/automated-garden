import { PartialType } from '@nestjs/swagger';
import { CreateGardenDto } from './create-garden.dto.js';

export class UpdateGardenDto extends PartialType(CreateGardenDto) {}
