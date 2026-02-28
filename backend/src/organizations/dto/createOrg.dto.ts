import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { OrganizationType } from 'src/common/enums/organizationType.enum';

export class CreateOrgDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  mspId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  peerEndpoint?: string;

  @ApiProperty()
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;
}
