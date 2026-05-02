import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../../common/enums/asset-type.enum';

export class GdO {
  @ApiProperty({
    example: 'gdo-12345',
    description: 'ID del GdO',
  })
  @IsString()
  @IsNotEmpty()
  gdoId: string;

  @ApiProperty({
    example: 'request-12345',
    description: 'ID de la solicitud asociada',
  })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    example: AssetType.ELECTRICITY,
    description: 'Tipo de activo',
    enum: AssetType,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;

  @ApiProperty({
    example: '2026-01-26T19:50:00Z',
    description: 'Fecha de emisión',
  })
  @IsString()
  @IsNotEmpty()
  issueDate: string;

  @ApiProperty({
    example: '2027-01-26T19:50:00Z',
    description: 'Fecha de expiración',
  })
  @IsString()
  @IsNotEmpty()
  expiryDate: string;

  @ApiProperty({
    example: 'owner-12345',
    description: 'ID del propietario',
  })
  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @ApiProperty({
    example: 'AVAILABLE',
    description: 'Estado del GdO',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class GdosByStatus {
  @ApiProperty({
    type: [GdO],
    description: 'GdOs disponibles',
  })
  @ValidateNested({ each: true })
  @Type(() => GdO)
  available: GdO[];

  @ApiProperty({
    type: [GdO],
    description: 'GdOs no disponibles',
  })
  @ValidateNested({ each: true })
  @Type(() => GdO)
  unavailable: GdO[];
}

export class GdosByAssetType {
  @ApiProperty({
    type: GdosByStatus,
    description: 'GdOs de electricidad',
  })
  @ValidateNested()
  @Type(() => GdosByStatus)
  ELECTRICITY: GdosByStatus;

  @ApiProperty({
    type: GdosByStatus,
    description: 'GdOs de hidrógeno',
  })
  @ValidateNested()
  @Type(() => GdosByStatus)
  H2: GdosByStatus;
}

export class GdoBalanceDto {
  @ApiProperty({
    example: 'producer-12345',
    description: 'ID del productor',
  })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({
    type: GdosByAssetType,
    description: 'GdOs agrupados por tipo de activo',
  })
  @ValidateNested()
  @Type(() => GdosByAssetType)
  gdos: GdosByAssetType;
}
