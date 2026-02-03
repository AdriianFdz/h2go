import { Injectable } from "@nestjs/common";
import { Organization } from "../entities/organization.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateOrgDto } from "./dto/createOrg.dto";
import { Role, User } from "src/entities/user.entity";
import { request } from "http";

@Injectable()
export class OrganizationsService {
    constructor(
        @InjectRepository(Organization)
        private organizationRepository: Repository<Organization>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }
    async createOrganization(createOrgDto: CreateOrgDto, user: User) {
        if (user.role !== Role.DEV) {
            throw new Error('Solo un desarrollador puede crear una organización');
        }

        const organization = this.organizationRepository.create(createOrgDto);
        await this.organizationRepository.save(organization);

        return { message: 'Organización creada exitosamente', organization: createOrgDto, createdBy: user };
    }

    async addUserToOrganization(id: string, userEmail: string, requestingUser: User) {
        if (requestingUser.role !== Role.DEV && requestingUser.role !== Role.ADMIN) {
            throw new Error('Solo un desarrollador o administrador puede agregar usuarios a una organización');
        }
        if (requestingUser.role === Role.ADMIN && requestingUser.organization.id !== id) {
            throw new Error('Un administrador solo puede agregar usuarios a su propia organización');
        }

        const organization = await this.organizationRepository.findOne({
            where: { id },
            relations: ['users']
        });
        if (!organization) {
            throw new Error('Organización no encontrada');
        }
        const user = await this.userRepository.findOne({ where: { email: userEmail } });
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        user.organization = organization;
        await this.userRepository.save(user);
        return { message: 'Usuario agregado a la organización exitosamente' };
    }

    async authorizeOrganization(id: string, requestingUser: User) {
        if (requestingUser.role !== Role.ADMIN) {
            throw new Error('Solo un administrador puede autorizar organizaciones');
        }

        if (!requestingUser.organization) {
            throw new Error('El administrador no pertenece a ninguna organización');
        }
        
        const orgToAuthorize = await this.organizationRepository.findOne({
            where: { id }
        });
        if (!orgToAuthorize) {
            throw new Error('Organización a autorizar no encontrada');
        }

        await this.organizationRepository
            .createQueryBuilder()
            .relation(Organization, 'authorizedOrgs')
            .of(requestingUser.organization)
            .add(orgToAuthorize);

        return { message: 'Organización autorizada exitosamente' };
    }
        
        
}