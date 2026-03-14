import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { AssetType } from 'src/common/enums/asset-type.enum';

export class CreateTradeRequestDto {
  @ApiProperty({
    description: 'The producer ID which will receive GdOs.',
    example: 'producer1',
  })
  @IsString()
  @IsNotEmpty()
  sourceProducerID: string;

  @ApiProperty({
    description: 'The target producer ID to which request will be sent.',
    example: 'producer2',
  })
  @IsString()
  @IsNotEmpty()
  targetProducerID: string;

  @ApiProperty({
    description: 'The asset type of the trade request.',
    example: AssetType.H2,
  })
  @IsNotEmpty()
  @IsEnum(AssetType)
  assetType: AssetType;

  @ApiProperty({
    description: 'The amount of assets to be traded.',
    example: 100,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;
}
