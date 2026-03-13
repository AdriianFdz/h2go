import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Name of the user',
    example: 'Adrián Fernández',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'test@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Role of the user',
    example: Role.ADMIN,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    description: 'Old password of the user (required if changing password)',
    example: 'oldpassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  oldPassword?: string;

  @ApiProperty({
    description: 'New password for the user (required if changing password)',
    example: 'newstrongpassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;

  @ApiProperty({
    description: "URL of the user's avatar",
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;
}
