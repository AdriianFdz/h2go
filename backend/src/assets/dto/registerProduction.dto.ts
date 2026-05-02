import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { AssetType } from '../../common/enums/assetType.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RegisterProductionDto {
  @ApiProperty({
    example: 'producer-12345',
    description: 'ID of the producer registering the asset production',
  })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({
    example: 'ELECTRICITY',
    description: 'Type of the asset being produced',
    enum: AssetType,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;

  @ApiProperty({
    example: 1000,
    description: 'Amount of the asset produced',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({
    example: '2026-01-26T19:50:00Z',
    description: 'Date and time when the production occurred',
  })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  productionDate: Date;
}
