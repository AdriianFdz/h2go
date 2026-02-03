import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional} from 'class-validator';

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
    @IsString()
    @IsNotEmpty()
    type: string;
}