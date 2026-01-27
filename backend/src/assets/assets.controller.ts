import { Controller, Post, UseGuards, Body, Req, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { User } from 'src/entities/user.entity';
import { RegisterProductionDto } from './dto/RegisterProduction.dto';

@ApiTags('assets')
@Controller('assets')
export class AssetsController {
    constructor(
        private assetsService: AssetsService,
    ) { }

    // @Post('production')
    // @UseGuards(AuthGuard('jwt'))
    // @ApiBearerAuth()
    // @ApiOperation({ summary: 'Register production of an asset' })
    // @ApiResponse({ status: 201, description: 'Production registered successfully.' })
    // @ApiResponse({ status: 401, description: 'Unauthorized.' })
    // registerProduction(@Req() req, @Body() body: RegisterProductionDto) {
    //     const user = req.user as User;
    //     return this.assetsService.registerProduction(user, body);
    // }

    @Get('production')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all production batches' })
    @ApiResponse({ status: 200, description: 'List of production batches retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    getAllProductionBatches(@Req() req) {
        const user = req.user as User;
        const response = this.assetsService.getAllProductionBatches(user);
        return response;
    }
}