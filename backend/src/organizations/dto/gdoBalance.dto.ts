import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetType } from '../../common/enums/asset-type.enum';

export class GDO {
  @ApiProperty({
    example: 'gdo-12345',
    description: 'ID del GDO',
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
    description: 'Estado del GDO',
  })
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class GdosByStatus {
  @ApiProperty({
    type: [GDO],
    description: 'GDOs disponibles',
  })
  @ValidateNested({ each: true })
  @Type(() => GDO)
  available: GDO[];

  @ApiProperty({
    type: [GDO],
    description: 'GDOs no disponibles',
  })
  @ValidateNested({ each: true })
  @Type(() => GDO)
  unavailable: GDO[];
}

export class GdosByAssetType {
  @ApiProperty({
    type: GdosByStatus,
    description: 'GDOs de electricidad',
  })
  @ValidateNested()
  @Type(() => GdosByStatus)
  ELECTRICITY: GdosByStatus;

  @ApiProperty({
    type: GdosByStatus,
    description: 'GDOs de hidrógeno',
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
    description: 'GDOs agrupados por tipo de activo',
  })
  @ValidateNested()
  @Type(() => GdosByAssetType)
  gdos: GdosByAssetType;
}
