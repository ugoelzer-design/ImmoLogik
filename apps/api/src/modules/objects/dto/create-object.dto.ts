import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateObjectDto {
  @ApiProperty({ example: 'Musterstraße 1', description: 'Name des Objekts' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    example: 'Musterstraße 1, 12345 Berlin',
    description: 'Adresse des Objekts',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @ApiProperty({ example: 4, description: 'Anzahl der Einheiten' })
  @IsNumber()
  @Min(1)
  units!: number;
}
