import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { ConnectionManager } from '../fabric/connectionManager';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User]), AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, ConnectionManager],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
