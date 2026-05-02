import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrganizationType } from '../../common/enums/organizationType.enum';

export class OrgAuthorizedDto {
  @ApiProperty({
    description: 'ID de la organización autorizada',
    example: 'org-12345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Nombre de la organización autorizada',
    example: 'Organization Name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Tipo de organización autorizada',
    example: 'Producer',
  })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;
}
