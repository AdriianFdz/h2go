import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { AssetType } from '../../common/enums/asset-type.enum';

export class PendingTradeRequestDto {
  @ApiProperty({
    example: 'tradeRequest',
    description: 'Tipo de documento',
  })
  @IsString()
  @IsNotEmpty()
  docType: string;

  @ApiProperty({
    example: 'trade-12345',
    description: 'ID del trade request',
  })
  @IsString()
  @IsNotEmpty()
  tradeID: string;

  @ApiProperty({
    example: 'producer-12345',
    description: 'ID del productor que envía la solicitud',
  })
  @IsString()
  @IsNotEmpty()
  producerID: string;

  @ApiProperty({
    example: 'producer-67890',
    description: 'ID del productor objetivo',
  })
  @IsString()
  @IsNotEmpty()
  targetID: string;

  @ApiProperty({
    example: AssetType.H2,
    description: 'Tipo de activo',
    enum: AssetType,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType | string;

  @ApiProperty({
    example: 1000,
    description: 'Cantidad del activo',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'PENDING',
    description: 'Estado de la solicitud',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: '2026-01-26T19:50:00Z',
    description: 'Fecha de creación',
  })
  @IsString()
  @IsNotEmpty()
  createdAt: string;
}
