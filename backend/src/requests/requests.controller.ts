import { Controller, Get, Post, Req, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending requests' })
  @ApiResponse({
    status: 200,
    description: 'List of pending requests retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAllPendingRequests(@Req() request) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.getAllPendingRequests(user);
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending request' })
  @ApiResponse({ status: 200, description: 'Request approved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  approveRequest(
    @Req() request,
    @Param('id') id: string,
    @Body('comment') comment: string,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.approveRequest(user, id, comment);
  }

  @Post(':id/reject')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  rejectRequest(
    @Req() request,
    @Param('id') id: string,
    @Body('comment') comment: string,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.rejectRequest(user, id, comment);
  }

  // Get if a requests is valid to approve or not
  @Get(':id/validation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate if a pending request can be approved' })
  @ApiResponse({
    status: 200,
    description: 'Request validation result retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  validateRequest(@Req() request, @Param('id') id: string) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.validateRequest(user, id);
  }
}
