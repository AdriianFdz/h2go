import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { ConnectionManager } from '../fabric/connectionManager';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, ConnectionManager],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
