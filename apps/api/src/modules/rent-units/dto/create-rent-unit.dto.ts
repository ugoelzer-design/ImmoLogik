import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRentUnitDto {
  @ApiProperty({
    example: 'obj-123',
    description: 'ID des zugehörigen Objekts',
  })
  @IsString()
  @IsNotEmpty()
  objectId: string;

  @ApiProperty({ example: 'EG links', description: 'Bezeichnung der Einheit' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  unitLabel: string;

  @ApiProperty({ example: 'Max Mustermann', description: 'Name des Mieters' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  tenant: string;

  @ApiProperty({ example: 850, description: 'Soll-Miete in Euro' })
  @IsNumber()
  @Min(0)
  sollMiete: number;

  @ApiPropertyOptional({ example: 850, description: 'Ist-Miete in Euro' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  istMiete?: number;

  @ApiPropertyOptional({ example: 'paid', description: 'Zahlungsstatus' })
  @IsOptional()
  @IsIn(['paid', 'unpaid', 'partial', 'overdue'])
  zahlungsStatus?: string;

  @ApiProperty({ example: '2024-01-05', description: 'Fälligkeitsdatum' })
  @IsDateString()
  faelligAm: string;
}
