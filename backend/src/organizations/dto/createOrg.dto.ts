import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrgDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    mspId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    peerEndpoint: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    type: string;
}