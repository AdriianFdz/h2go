import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
  Param,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateOrgDto } from './dto/createOrg.dto';
import { RedeemGDOsDto } from './dto/redeemGDOs.dto';
import { OrganizationsService } from './organizations.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createOrganization(@Body() createOrgDto: CreateOrgDto, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.createOrganization(createOrgDto, user);
  }

  @Post(':id/users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a user to an organization' })
  @ApiResponse({
    status: 201,
    description: 'User added to the organization successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addUserToOrganization(
    @Param('id') id: string,
    @Param('userEmail') userEmail: string,
    @Req() req,
  ) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.addUserToOrganization(id, userEmail, user);
  }

  @Post(':id/authorize')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Authorize an organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization authorized successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  authorizeOrganization(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.authorizeOrganization(id, user);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization information' })
  @ApiResponse({
    status: 200,
    description: 'Organization information retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getOrganization(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.getOrganization(id, user);
  }

  @Get(':id/balance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization balance' })
  @ApiResponse({
    status: 200,
    description: 'Organization balance retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getOrganizationBalance(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.getOrganizationBalance(id, user);
  }

  // redeem gdos
  @Post(':id/redemption')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem GDOs for an organization' })
  @ApiResponse({
    status: 201,
    description: 'GDOs redeemed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  redeemGDOs(@Param('id') id: string, @Body() body: RedeemGDOsDto, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.redeemGDOs(
      id,
      body.assetType,
      body.gdosToRedeem,
      user,
    );
  }
}
