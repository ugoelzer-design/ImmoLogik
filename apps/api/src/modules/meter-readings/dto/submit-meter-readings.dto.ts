import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitMeterReadingItemDto {
  @ApiProperty({ example: 'meter-123', description: 'ID des Zählers' })
  @IsString()
  @IsNotEmpty()
  meterId!: string;

  @ApiProperty({ example: 12345.6, description: 'Abgelesener Wert' })
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Datum der Ablesung (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class SubmitMeterReadingsDto {
  @ApiPropertyOptional({
    example: 'Max Mustermann',
    description: 'Name des Ablesenden',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readerName?: string;

  @ApiProperty({
    type: [SubmitMeterReadingItemDto],
    description: 'Liste der Zählerstände',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitMeterReadingItemDto)
  readings!: SubmitMeterReadingItemDto[];
}
