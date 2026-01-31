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
    @ApiOperation({ summary: 'Create a new organization' })
    @ApiResponse({ status: 201, description: 'Organization created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    createOrganization(@Body() createOrgDto: CreateOrgDto, @Req() req) {
        const user = req.user as User;
        return this.organizationsService.createOrganization(createOrgDto, user);
    }

    @Post(':mspId/users')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add a user to an organization' })
    @ApiResponse({ status: 201, description: 'User added to the organization successfully' })
    @ApiResponse({ status: 400, description: 'Invalid data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    addUserToOrganization(@Param('mspId') mspId: string, @Param('userEmail') userEmail: string, @Req() req) {
        const user = req.user as User;
        return this.organizationsService.addUserToOrganization(mspId, userEmail, user);
    }
}