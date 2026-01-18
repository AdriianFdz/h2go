import { Controller, Post, UseGuards, Body, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrgDto } from './dto/createOrg.dto';
import { OrganizationService } from './organization.service';
import { User } from 'src/entities/user.entity';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
    constructor(
        private organizationService: OrganizationService,
    ) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Crear una nueva organización' })
    @ApiResponse({ status: 201, description: 'Organización creada exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    createOrganization(@Body() createOrgDto: CreateOrgDto, @Req() req) {
        const user = req.user as User;
        return this.organizationService.createOrganization(createOrgDto, user);
    }
}