import { Injectable, Inject } from '@nestjs/common';
import { Organization } from '../entities/organization.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrgDto } from './dto/createOrg.dto';
import { Role, User } from 'src/entities/user.entity';
import { IAuthenticatedUser } from 'src/auth/interfaces/authenticatedUser';
import { ConnectionManager } from '../fabric/connectionManager';
import { GdoBalanceDto } from './dto/gdoBalance.dto';
import { AssetType } from 'src/common/enums/asset-type.enum';
import { CreateUserDto } from './dto/createUser.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
  ) { }
  async createOrganization(
    createOrgDto: CreateOrgDto,
    user: IAuthenticatedUser,
  ) {
    if (user.role !== Role.DEV) {
      throw new Error('Solo un desarrollador puede crear una organización');
    }

    const organization = this.organizationRepository.create(createOrgDto);
    await this.organizationRepository.save(organization);

    return {
      message: 'Organización creada exitosamente',
      organization: createOrgDto,
      createdBy: user,
    };
  }

  async createUserForOrganization(
    id: string,
    createUserDto: CreateUserDto,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error(
        'Solo un administrador puede agregar usuarios a una organización',
      );
    }
    if (
      requestingUser.role === Role.ADMIN &&
      requestingUser.organization.id !== id
    ) {
      throw new Error(
        'Un administrador solo puede agregar usuarios a su propia organización',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organización no encontrada');
    }
    const user = this.userRepository.create(createUserDto);
    user.organization = organization;

    await this.userRepository.save(user);
    return { message: 'Usuario agregado a la organización exitosamente', user };
  }

  async authorizeOrganization(id: string, requestingUser: IAuthenticatedUser) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error('Solo un administrador puede autorizar organizaciones');
    }

    if (!requestingUser.organization) {
      throw new Error('El administrador no pertenece a ninguna organización');
    }

    const orgToAuthorize = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!orgToAuthorize) {
      throw new Error('Organización a autorizar no encontrada');
    }

    await this.organizationRepository
      .createQueryBuilder()
      .relation(Organization, 'authorizedOrgs')
      .of(requestingUser.organization.id)
      .add(orgToAuthorize);

    return { message: 'Organización autorizada exitosamente' };
  }

  async getOrganization(id: string, requestingUser: IAuthenticatedUser) {
    const userOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedByOrgs', 'users'],
    });

    if (!userOrg) {
      throw new Error('Organización del usuario no encontrada');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Solo los usuarios de la organización o autorizados pueden consultar su información',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    return {
      id: organization.id,
      name: organization.name,
      type: organization.type,
      mspId: organization.mspId,
      users: organization.users,
    };
  }

  async getOrganizationBalance(
    id: string,
    requestingUser: IAuthenticatedUser,
  ): Promise<GdoBalanceDto> {
    const userOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedByOrgs'],
    });

    if (!userOrg) {
      throw new Error('Organización del usuario no encontrada');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Solo los usuarios de la organización o autorizados pueden consultar su balance',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(requestingUser);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RedemptionContract:GetProducerBalance',
        id,
      );
      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        return {
          producerId: id,
          gdos: {
            ELECTRICITY: { available: [], unavailable: [] },
            H2: { available: [], unavailable: [] },
          },
        };
      }

      const balance: GdoBalanceDto = JSON.parse(resultString);
      return balance;
    } catch (error) {
      // owner balance does not exist
      const errorMessage = error?.message || String(error);
      if (
        errorMessage.includes('owner balance does not exist') ||
        errorMessage.includes('code 2')
      ) {
        return {
          producerId: id,
          gdos: {
            ELECTRICITY: { available: [], unavailable: [] },
            H2: { available: [], unavailable: [] },
          },
        };
      }
      throw new Error('Error al consultar el balance: ' + errorMessage);
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async redeemGDOs(
    id: string,
    assetType: AssetType,
    gdosToRedeem: string[],
    requestingUser: IAuthenticatedUser,
  ) {
    const userOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedByOrgs'],
    });

    if (!userOrg) {
      throw new Error('Organización del usuario no encontrada');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Solo los usuarios de la organización o autorizados pueden redimir GDOs',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(requestingUser);
    try {
      const result = await this.connectionManager.executeTransaction(
        gateway,
        client,
        'RedemptionContract:RedeemGDOs',
        id,
        assetType.toString(),
        JSON.stringify(gdosToRedeem),
      );
      const resultString = Buffer.from(result).toString('utf8');
      return { message: 'GDOs redimidos exitosamente', details: resultString };
    } catch (error) {
      const errorMessage = error?.message || String(error);
      throw new Error('Error al redimir GDOs: ' + errorMessage);
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }
}
