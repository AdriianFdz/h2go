import { Injectable } from "@nestjs/common";
import { Organization } from "../entities/organization.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateOrgDto } from "./dto/createOrg.dto";
import { User } from "src/entities/user.entity";

@Injectable()
export class OrganizationService {
    constructor(
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
    ) { }
    async createOrganization(createOrgDto: CreateOrgDto, user: User) {
        if (user.role !== 'Dev') {
            throw new Error('Solo un desarrollador puede crear una organización');
        }
        const organization = this.organizationRepository.create(createOrgDto);
        await this.organizationRepository.save(organization);

        return { message: 'Organización creada exitosamente', organization: createOrgDto, createdBy: user };
    }
}