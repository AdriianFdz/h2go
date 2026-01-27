import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ConnectionManager } from '../fabric/connectionManager';

@Module({
    imports: [TypeOrmModule.forFeature([Organization, User])],
    controllers: [AssetsController],
    providers: [AssetsService, ConnectionManager],
    exports: [AssetsService],
})
export class AssetsModule { }