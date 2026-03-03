import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
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
import { CreateOrgDto } from './dto/createOrg.dto';
import { RedeemGDOsDto } from './dto/redeemGDOs.dto';
import { OrganizationsService } from './organizations.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { CreateUserDto } from './dto/createUser.dto';
import { UpdateUserDto } from './dto/updateUser.dto';

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
  updateUserFromOrganization(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto,
    @Req() req,
  ) {
    const user = req.user as IAuthenticatedUser;
    return this.organizationsService.updateUserFromOrganization(
      id,
      userId,
      body,
      user,
    );
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
