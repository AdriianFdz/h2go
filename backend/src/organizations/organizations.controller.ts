import { Controller, Post, UseGuards, Body, Req, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CreateOrgDto } from './dto/createOrg.dto';
import { OrganizationsService } from './organizations.service';
import { User } from 'src/entities/user.entity';

@ApiTags('organization')
@Controller('organizations')
export class OrganizationsController {
    constructor(
        private organizationsService: OrganizationsService,
    ) { }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Crear una nueva organización' })
    @ApiResponse({ status: 201, description: 'Organización creada exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    createOrganization(@Body() createOrgDto: CreateOrgDto, @Req() req) {
        const user = req.user as User;
        return this.organizationsService.createOrganization(createOrgDto, user);
    }

    @Post(':mspId/users')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Agregar un usuario a una organización' })
    @ApiResponse({ status: 201, description: 'Usuario agregado a la organización exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 401, description: 'No autorizado' })
    addUserToOrganization(@Param('mspId') mspId: string, @Param('userEmail') userEmail: string, @Req() req) {
        const user = req.user as User;
        return this.organizationsService.addUserToOrganization(mspId, userEmail, user);
    }
}