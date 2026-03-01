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
import { UpdateUserDto } from './dto/updateUser.dto';
import * as bcrypt from 'bcrypt';
import { OrganizationType } from 'src/common/enums/organizationType.enum';
import * as cloudinary from 'cloudinary';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
  ) {}

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
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    user.password = hashedPassword;

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

    if (orgToAuthorize.type !== OrganizationType.TRADER) {
      throw new Error('Solo se pueden autorizar organizaciones de tipo TRADER');
    }

    const requesterOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
    });

    if (!requesterOrg) {
      throw new Error('Organización del administrador no encontrada');
    }

    if (requesterOrg.type !== OrganizationType.PRODUCER) {
      throw new Error(
        'Solo las organizaciones de tipo PRODUCER pueden autorizar otras organizaciones',
      );
    }

    requesterOrg.authorizedByOrgs = [
      ...(requesterOrg.authorizedByOrgs || []),
      orgToAuthorize,
    ];
    await this.organizationRepository.save(requesterOrg);
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

  async updateUserFromOrganization(
    id: string,
    userId: string,
    updateUserDto: UpdateUserDto,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN && requestingUser.id !== userId) {
      throw new Error('No tienes permisos para actualizar este usuario');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    requestingUser = organization.users.find(
      (user) => user.id === requestingUser.id,
    )!;

    if (
      requestingUser.id !== userId &&
      organization.users.every((user) => user.id !== userId)
    ) {
      throw new Error('El usuario no pertenece a tu organización');
    }
    // Aqui hemos confirmado que el usuario es admin o el mismo

    const userToUpdate = organization.users.find((user) => user.id === userId);
    if (!userToUpdate) {
      throw new Error('Usuario no encontrado en la organización');
    }
    if (
      requestingUser.role !== Role.ADMIN &&
      updateUserDto.newPassword != null
    ) {
      let oldPasswordCorrect = false;
      try {
        oldPasswordCorrect = await bcrypt.compare(
          updateUserDto.oldPassword,
          userToUpdate.password,
        );
      } catch {
        throw new Error('Error al verificar la contraseña antigua');
      }
      if (!oldPasswordCorrect) {
        throw new Error('La contraseña antigua no es correcta');
      }
    }
    if (
      requestingUser.role !== Role.ADMIN &&
      updateUserDto.role &&
      updateUserDto.role !== userToUpdate.role
    ) {
      throw new Error('No tienes permisos para cambiar el rol');
    }

    if (updateUserDto.name != null) {
      userToUpdate.name = updateUserDto.name;
    }
    if (
      updateUserDto.email != null &&
      !(await this.userRepository.exists({
        where: { email: updateUserDto.email },
      }))
    ) {
      userToUpdate.email = updateUserDto.email;
    }
    if (updateUserDto.role != null) {
      userToUpdate.role = updateUserDto.role;
    }
    if (updateUserDto.avatar != null) {
      await cloudinary.v2.uploader
        .upload(updateUserDto.avatar, {
          overwrite: true,
          folder: 'avatars',
          public_id: userToUpdate.id,
        })
        .then((result) => {
          console.log(result);
          userToUpdate.avatar = result.secure_url;
        })
        .catch(() => {
          throw new Error('Error al subir la imagen de perfil');
        });
    }
    if (updateUserDto.newPassword != null) {
      const hashedPassword = await bcrypt.hash(updateUserDto.newPassword, 10);
      userToUpdate.password = hashedPassword;
    }

    await this.userRepository.save(userToUpdate);
    return { message: 'Usuario actualizado exitosamente', user: userToUpdate };
  }

  async deleteUserFromOrganization(
    id: string,
    userId: string,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error('No tienes permisos para eliminar este usuario');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    const userToDelete = organization.users.find((user) => user.id === userId);
    if (!userToDelete) {
      throw new Error('Usuario no encontrado en la organización');
    }

    await this.userRepository.remove(userToDelete);
    return { message: 'Usuario eliminado de la organización exitosamente' };
  }
}
