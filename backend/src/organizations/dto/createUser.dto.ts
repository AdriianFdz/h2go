import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'test@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for the user',
    example: 'strongpassword123',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'Adrián Fernández',
  })
  @IsString()
  @MinLength(1)
  name: string;
}
