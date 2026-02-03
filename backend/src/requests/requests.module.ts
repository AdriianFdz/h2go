import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { ConnectionManager } from '../fabric/connectionManager';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [RequestsController],
  providers: [RequestsService, ConnectionManager],
  exports: [RequestsService],
})
export class RequestsModule {}
