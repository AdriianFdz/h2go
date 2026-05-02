import { AssetType } from '../../common/enums/asset-type.enum';
import { IsEnum, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemGdOsDto {
  @ApiProperty({ enum: AssetType, example: AssetType.H2 })
  @IsEnum(AssetType)
  assetType: AssetType;

  @ApiProperty({ type: [String], example: ['gdo1', 'gdo2'] })
  @IsArray()
  @ArrayNotEmpty()
  gdosToRedeem: string[];
}
