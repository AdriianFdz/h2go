import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { AssetType } from '../../common/enums/asset-type.enum';

export class PendingTransformationRequestDto {
  @ApiProperty({
    example: 'request',
    description: 'Tipo de documento',
  })
  @IsString()
  @IsNotEmpty()
  docType: string;

  @ApiProperty({
    example: 'request-12345',
    description: 'ID de la solicitud',
  })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    example: 'producer-12345',
    description: 'ID del productor',
  })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({
    example: AssetType.ELECTRICITY,
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
