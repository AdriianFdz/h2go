import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestsService } from './requests.service';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { none } from '@hyperledger/fabric-gateway/dist/hash/hashes';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private requestsService: RequestsService) {}
  @Get()
  getAllPendingRequests(@Req() request) {
    //TODO
    return none;
  }
}
