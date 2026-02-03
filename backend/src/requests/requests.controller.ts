import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private requestsService: RequestsService) {}
  @Get()
  getAllPendingRequests(@Req() request) {
    const user: IAuthenticatedUser = request.user;
    return this.requestsService.getAllPendingRequests(user);
  }
}
