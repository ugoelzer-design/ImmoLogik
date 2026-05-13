import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    example: 'obj-123',
    description: 'ID des zugehörigen Objekts',
  })
  @IsString()
  @IsNotEmpty()
  objectId!: string;

  @ApiProperty({ example: 'unit-456', description: 'ID der Mieteinheit' })
  @IsString()
  @IsNotEmpty()
  rentUnitId!: string;

  @ApiProperty({
    example: 'Max Mustermann',
    description: 'Vollständiger Name des Mieters',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty({ example: 'max@example.com', description: 'E-Mail-Adresse' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+49 170 1234567', description: 'Telefonnummer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  phone!: string;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Status des Mieters (active, inactive)',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
