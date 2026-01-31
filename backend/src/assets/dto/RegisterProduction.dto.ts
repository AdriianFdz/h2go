import { IsDate, IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { AssetType } from "./enums/AssetType";
import { Unit } from "./enums/Unit";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterProductionDto {
    @ApiProperty({
        example: 'producer-12345',
        description: 'ID of the producer registering the asset production',
    })
    @IsString()
    @IsNotEmpty()
    producerId: string;

    @ApiProperty({
        example: 'ELECTRICITY',
        description: 'Type of the asset being produced',
        enum: AssetType,
    })
    @IsNotEmpty()
    assetType: AssetType;

    @ApiProperty({
        example: 1000,
        description: 'Amount of the asset produced',
    })
    @IsInt()
    @Min(1)
    amount: number;

    @ApiProperty({
        example: 'KWH',
        description: 'Unit of the asset produced',
        enum: Unit,
    })
    @IsNotEmpty()
    unit: Unit

    @ApiProperty({
        example: '2026-01-26T19:50:00Z',
        description: 'Date and time when the production occurred',
    })
    @IsDate()
    @IsNotEmpty()
    productionDate: Date;
}