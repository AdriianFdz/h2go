import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { OrganizationType } from '../../common/enums/organizationType.enum';

export class CreateOrgDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Trader1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'ID of the MSP',
    example: 'Trader1MSP',
  })
  @IsString()
  @IsOptional()
  mspId?: string;

  @ApiProperty({
    description: 'Endpoint of the peer',
    example: 'peer0-trader1.localho.st:443',
  })
  @IsString()
  @IsOptional()
  peerEndpoint?: string;

  @ApiProperty({
    description: 'Type of the organization',
    example: OrganizationType.TRADER,
  })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;
}
