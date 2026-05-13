import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReadingCampaignDto {
  @ApiProperty({
    example: 'obj-123',
    description: 'ID des zugehörigen Objekts',
  })
  @IsString()
  @IsNotEmpty()
  objectId!: string;

  @ApiProperty({ example: 2024, description: 'Abrechnungsjahr' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  reportYear!: number;

  @ApiPropertyOptional({
    example: '2024-03-31T23:59:59Z',
    description: 'Ablaufzeitpunkt der Kampagne (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
