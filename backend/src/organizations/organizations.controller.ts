import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
  Res,
  Param,
  Get,
  Patch,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateOrgDto } from '../assets/dto/createOrg.dto';
import { UpdateOrgDto } from '../assets/dto/updateOrg.dto';
import { RedeemGdOsDto } from '../assets/dto/redeemGdOs.dto';
import { OrgAuthorizedDto } from '../assets/dto/orgAuthorized.dto';
import { GdoBalanceDto } from '../assets/dto/gdoBalance.dto';
import { OrganizationsService } from './organizations.service';
import { AuthService } from '../auth/auth.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { CreateUserDto } from '../assets/dto/createUser.dto';
import { UpdateUserDto } from '../assets/dto/updateUser.dto';
import type { Response } from 'express';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private organizationsService: OrganizationsService,
    private authService: AuthService,
  ) { }

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

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all organizations (DEV only)' })
  @ApiResponse({
    status: 200,
    description: 'All organizations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAllOrganizations(@Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.getAllOrganizations(user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an organization (DEV only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateOrganization(
    @Param('id') id: string,
    @Body() updateOrgDto: UpdateOrgDto,
    @Req() req,
  ) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.updateOrganization(id, updateOrgDto, user);
  }

  @Post(':id/users')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a user for an organization' })
  @ApiResponse({
    status: 201,
    description: 'User created for the organization successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createUserForOrganization(
    @Param('id') id: string,
    @Body() body: CreateUserDto,
    @Req() req,
  ) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.createUserForOrganization(id, body, user);
  }

  @Get(':id/authorizations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authorizations for an organization' })
  @ApiResponse({
    status: 200,
    description: 'Authorizations retrieved successfully',
    type: [OrgAuthorizedDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getAuthorizationsFromOrganization(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.getAuthorizationsOfOrganization(id, user);
  }

  @Post(':id/authorizations')
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

  @Delete(':id/authorizations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unauthorize an organization' })
  @ApiResponse({
    status: 200,
    description: 'Organization unauthorized successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  unauthorizeOrganization(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.unauthorizeOrganization(id, user);
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
    type: GdoBalanceDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getOrganizationBalance(@Param('id') id: string, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.getOrganizationBalance(id, user);
  }

  @Post(':id/redemption')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem GdOs for an organization' })
  @ApiResponse({
    status: 201,
    description: 'GdOs redeemed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  redeemGdOs(@Param('id') id: string, @Body() body: RedeemGdOsDto, @Req() req) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.redeemGdOs(
      id,
      body.assetType,
      body.gdosToRedeem,
      user,
    );
  }

  @Patch(':id/users/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user for an organization' })
  @ApiResponse({
    status: 200,
    description: 'User updated for the organization successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserFromOrganization(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const requestingUser = req.user as IAuthenticatedUser;
    const result = await this.organizationsService.updateUserFromOrganization(
      id,
      userId,
      body,
      requestingUser,
    );

    if (requestingUser.id === userId) {
      const remainingMs = requestingUser.exp
        ? requestingUser.exp * 1000 - Date.now()
        : parseInt(process.env.JWT_EXPIRATION ?? '86400000');
      const { access_token } = this.authService.login(
        { ...result.user, organization: requestingUser.organization },
        remainingMs,
      );
      res.cookie('token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: remainingMs,
      });
    }

    return result;
  }

  @Delete(':id/users/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a user from an organization' })
  @ApiResponse({
    status: 200,
    description: 'User deleted from the organization successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteUserFromOrganization(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req,
  ) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.deleteUserFromOrganization(
      id,
      userId,
      user,
    );
  }
}
