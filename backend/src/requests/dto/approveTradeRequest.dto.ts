import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';

export class ApproveTradeRequestDto {
  @ApiProperty({
    description: 'List of GdO IDs to exchange in the trade',
    example: ['gdo-123', 'gdo-456'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  gdoIds: string[];
}
