import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { OrganizationType } from '../../common/enums/organizationType.enum';

export class UpdateOrgDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Trader1',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'ID of the MSP',
    example: 'Trader1MSP',
    required: false,
  })
  @IsString()
  @IsOptional()
  mspId?: string;

  @ApiProperty({
    description: 'Endpoint of the peer',
    example: 'peer0-trader1.localho.st:443',
    required: false,
  })
  @IsString()
  @IsOptional()
  peerEndpoint?: string;

  @ApiProperty({
    description: 'Type of the organization',
    example: OrganizationType.TRADER,
    required: false,
  })
  @IsEnum(OrganizationType)
  @IsOptional()
  type?: OrganizationType;
}
