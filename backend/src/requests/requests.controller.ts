import {
  Controller,
  Get,
  Post,
  Req,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { CreateIssuanceRequestDto } from './dto/createIssuanceRequest.dto';
import { CreateTradeRequestDto } from './dto/createTradeRequest.dto';
import { ApproveTradeRequestDto } from './dto/approveTradeRequest.dto';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private requestsService: RequestsService) {}

  @Post('issuance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new issuance request' })
  @ApiResponse({ status: 201, description: 'Request created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createRequest(
    @Req() request,
    @Body() createRequestDto: CreateIssuanceRequestDto,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.createIssuanceRequest(user, createRequestDto);
  }

  @Get('issuance')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending issuance requests' })
  @ApiResponse({
    status: 200,
    description: 'List of pending issuance requests retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAllPendingIssuanceRequests(@Req() request) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.getAllPendingIssuanceRequests(user);
  }

  @Post('issuance/:id/approve')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending issuance request' })
  @ApiResponse({ status: 200, description: 'Request approved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  approveRequest(
    @Req() request,
    @Param('id') id: string,
    @Body('comment') comment: string,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.approveIssuanceRequest(user, id, comment);
  }

  @Post('issuance/:id/reject')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending issuance request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  rejectRequest(
    @Req() request,
    @Param('id') id: string,
    @Body('comment') comment: string,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.rejectIssuanceRequest(user, id, comment);
  }

  @Get('issuance/:id/validation')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate if a pending issuance request can be approved',
  })
  @ApiResponse({
    status: 200,
    description: 'Request validation result retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  validateRequest(@Req() request, @Param('id') id: string) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.validateIssuanceRequest(user, id);
  }

  @Post('trades')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new trade request' })
  @ApiResponse({ status: 201, description: 'Request created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createTradeRequest(
    @Req() request,
    @Body() createTradeRequestDto: CreateTradeRequestDto,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.createTradeRequest(user, createTradeRequestDto);
  }

  @Get('trades/producer/:producerId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending trade requests for a producer' })
  @ApiResponse({
    status: 200,
    description: 'List of pending trade requests retrieved successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAllPendingTradeRequests(
    @Req() request,
    @Param('producerId') producerId: string,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.getAllPendingTradeRequests(user, producerId);
  }

  @Post('trades/:id/approve')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve a pending trade request' })
  @ApiResponse({ status: 200, description: 'Request approved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  approveTradeRequest(
    @Req() request,
    @Param('id') id: string,
    @Body() approveDto: ApproveTradeRequestDto,
  ) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.approveTradeRequest(
      user,
      id,
      approveDto.gdoIds,
    );
  }

  @Post('trades/:id/reject')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject a pending trade request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  rejectTradeRequest(@Req() request, @Param('id') id: string) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.rejectTradeRequest(user, id);
  }

  // @Get('trades/:id')
  // @UseGuards(AuthGuard('jwt'))
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Get a specific trade request by ID' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Trade request retrieved successfully.',
  // })
  // @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // @ApiResponse({ status: 404, description: 'Trade request not found.' })
  // getTradeRequestById(@Req() request, @Param('id') id: string) {
  //   const user: IAuthenticatedUser = request.user;
  //   return this.requestsService.getTradeRequestById(user, id);
  // }
}
