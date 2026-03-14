import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { AssetType } from '../../common/enums/asset-type.enum';

export class CreateIssuanceRequestDto {
  @ApiProperty({
    example: 'producer-12345',
    description: 'ID del productor que hace la solicitud',
  })
  @IsString()
  @IsNotEmpty()
  producerId: string;

  @ApiProperty({
    example: AssetType.ELECTRICITY,
    description: 'Tipo de activo solicitado',
    enum: AssetType,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;

  @ApiProperty({
    example: 1000,
    description: 'Cantidad del activo solicitado',
  })
  @IsInt()
  @Min(1)
  amount: number;
}
