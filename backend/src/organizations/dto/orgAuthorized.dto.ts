import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrganizationType } from 'src/common/enums/organizationType.enum';

export class OrgAuthorizedDto {
  @ApiProperty({
    example: 'org-12345',
    description: 'ID de la organización autorizada',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    example: 'Organization Name',
    description: 'Nombre de la organización autorizada',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'PRODUCER',
    description: 'Tipo de organización autorizada',
  })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;
}
