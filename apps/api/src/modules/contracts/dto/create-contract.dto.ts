import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContractDto {
  @ApiProperty({
    example: 'obj-123',
    description: 'ID des zugehörigen Objekts',
  })
  @IsString()
  @IsNotEmpty()
  objectId!: string;

  @ApiProperty({ example: 'tenant-456', description: 'ID des Mieters' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiPropertyOptional({
    example: 'unit-789',
    description: 'ID der Mieteinheit (optional)',
  })
  @IsOptional()
  @IsString()
  rentUnitId?: string | null;

  @ApiProperty({
    example: 'Mietvertrag EG links',
    description: 'Titel des Vertrags',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @ApiProperty({ example: '2024-01-01', description: 'Startdatum (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-12-31', description: 'Enddatum (ISO 8601)' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Status des Vertrags',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'terminated'])
  status?: string;
}
