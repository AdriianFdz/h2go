import { Injectable, Inject } from '@nestjs/common';
import { Organization } from '../entities/organization.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrgDto } from '../assets/dto/createOrg.dto';
import { UpdateOrgDto } from '../assets/dto/updateOrg.dto';
import { User } from '../entities/user.entity';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { ConnectionManager } from '../fabric/connectionManager';
import { GdoBalanceDto } from '../assets/dto/gdoBalance.dto';
import { AssetType } from '../common/enums/asset-type.enum';
import { CreateUserDto } from '../assets/dto/createUser.dto';
import { UpdateUserDto } from '../assets/dto/updateUser.dto';
import * as bcrypt from 'bcrypt';
import { OrganizationType } from '../common/enums/organizationType.enum';
import * as cloudinary from 'cloudinary';
import { OrgAuthorizedDto } from '../assets/dto/orgAuthorized.dto';
import { Role } from '../common/enums/role.enum';

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
      throw new Error('Only a developer can create an organization');
    }

    const organization = this.organizationRepository.create(createOrgDto);
    await this.organizationRepository.save(organization);

    return {
      message: 'Organization created successfully',
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
        'Only an admin can add users to an organization',
      );
    }
    if (
      requestingUser.role === Role.ADMIN &&
      requestingUser.organization.id !== id
    ) {
      throw new Error(
        'An admin can only add users to their own organization',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organization not found');
    }
    const user = this.userRepository.create(createUserDto);
    user.organization = organization;
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    user.password = hashedPassword;

    await this.userRepository.save(user);
    return { message: 'User added to organization successfully', user };
  }

  async authorizeOrganization(id: string, requestingUser: IAuthenticatedUser) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error('Only an admin can authorize organizations');
    }

    if (!requestingUser.organization) {
      throw new Error('The admin does not belong to any organization');
    }

    const orgToAuthorize = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!orgToAuthorize) {
      throw new Error('Organization to authorize not found');
    }

    if (orgToAuthorize.type !== OrganizationType.TRADER) {
      throw new Error('Only TRADER type organizations can be authorized');
    }

    const requesterOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
    });

    if (!requesterOrg) {
      throw new Error('Admin organization not found');
    }

    if (requesterOrg.type !== OrganizationType.PRODUCER) {
      throw new Error(
        'Only PRODUCER type organizations can authorize other organizations',
      );
    }

    requesterOrg.authorizedOrgs = [
      ...(requesterOrg.authorizedOrgs || []),
      orgToAuthorize,
    ];
    await this.organizationRepository.save(requesterOrg);
    return { message: 'Organization authorized successfully' };
  }

  async getOrganization(id: string, requestingUser: IAuthenticatedUser) {
    const userOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedByOrgs', 'users'],
    });

    if (!userOrg) {
      throw new Error('User organization not found');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Only users of the organization or authorized users can consult their information',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });

    if (!organization) {
      throw new Error('Organization not found');
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
      throw new Error('User organization not found');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Only users of the organization or authorized users can consult their balance',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new Error('Organization not found');
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
      throw new Error('Error while consulting the balance: ' + errorMessage);
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async redeemGdOs(
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
      throw new Error('User organization not found');
    }

    const isOwnOrg = userOrg.id === id;
    const isAuthorizedByOrg =
      userOrg.authorizedByOrgs?.some((org) => org.id === id) || false;

    if (!isOwnOrg && !isAuthorizedByOrg) {
      throw new Error(
        'Only users of the organization or authorized users can redeem GdOs',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(requestingUser);
    try {
      const result = await this.connectionManager.executeTransaction(
        gateway,
        client,
        'RedemptionContract:RedeemGdOs',
        id,
        assetType.toString(),
        JSON.stringify(gdosToRedeem),
      );
      const resultString = Buffer.from(result).toString('utf8');
      return { message: 'GdOs redeemed successfully', details: resultString };
    } catch (error) {
      const errorMessage = error?.message || String(error);
      throw new Error('Error while redeeming GdOs: ' + errorMessage);
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
      throw new Error('You do not have permission to update this user');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organization not found');
    }

    requestingUser = organization.users.find(
      (user) => user.id === requestingUser.id,
    )!;

    if (
      requestingUser.id !== userId &&
      organization.users.every((user) => user.id !== userId)
    ) {
      throw new Error('The user does not belong to your organization');
    }

    const userToUpdate = organization.users.find((user) => user.id === userId);
    if (!userToUpdate) {
      throw new Error('User not found in the organization');
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
        throw new Error('Error while verifying the old password');
      }
      if (!oldPasswordCorrect) {
        throw new Error('The old password is not correct');
      }
    }
    if (
      requestingUser.role !== Role.ADMIN &&
      updateUserDto.role &&
      updateUserDto.role !== userToUpdate.role
    ) {
      throw new Error('You do not have permission to change the role');
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
          throw new Error('Error while uploading the profile image');
        });
    }
    if (updateUserDto.newPassword != null) {
      const hashedPassword = await bcrypt.hash(updateUserDto.newPassword, 10);
      userToUpdate.password = hashedPassword;
    }

    await this.userRepository.save(userToUpdate);
    return { message: 'User updated successfully', user: userToUpdate };
  }

  async unauthorizeOrganization(
    id: string,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error(
        'Only an admin can unauthorize organizations',
      );
    }

    if (!requestingUser.organization) {
      throw new Error('The admin does not belong to any organization');
    }

    const requesterOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedOrgs'],
    });

    if (!requesterOrg) {
      throw new Error('Admin organization not found');
    }

    if (requesterOrg.type !== OrganizationType.PRODUCER) {
      throw new Error(
        'Only PRODUCER type organizations can unauthorize other organizations',
      );
    }
    if (requesterOrg.id === id) {
      throw new Error('You cannot unauthorize your own organization');
    }

    if (!requesterOrg.authorizedOrgs?.some((org) => org.id === id)) {
      throw new Error('The organization is not authorized');
    }
    requesterOrg.authorizedOrgs = requesterOrg.authorizedOrgs.filter(
      (org) => org.id !== id,
    );
    await this.organizationRepository.save(requesterOrg);
    return { message: 'Organization unauthorized successfully' };
  }

  async deleteUserFromOrganization(
    id: string,
    userId: string,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error('You do not have permission to delete this user');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!organization) {
      throw new Error('Organization not found');
    }

    const userToDelete = organization.users.find((user) => user.id === userId);
    if (!userToDelete) {
      throw new Error('User not found in the organization');
    }

    await this.userRepository.remove(userToDelete);
    return { message: 'User deleted from the organization successfully' };
  }

  async getAuthorizationsOfOrganization(
    id: string,
    requestingUser: IAuthenticatedUser,
  ) {
    if (requestingUser.role !== Role.ADMIN) {
      throw new Error('You do not have permission to view authorizations');
    }
    if (requestingUser.organization.id !== id) {
      throw new Error(
        'You can only view the authorizations of your own organization',
      );
    }

    const userOrg = await this.organizationRepository.findOne({
      where: { id: requestingUser.organization.id },
      relations: ['authorizedOrgs'],
    });

    if (!userOrg) {
      throw new Error('User organization not found');
    }

    const authorizedOrgs: OrgAuthorizedDto[] = userOrg.authorizedOrgs.map(
      (org) => ({
        id: org.id,
        name: org.name,
        type: org.type,
        mspId: org.mspId,
      }),
    );

    return authorizedOrgs;
  }

  async getAllOrganizations(user: IAuthenticatedUser) {
    if (user.role !== Role.DEV) {
      throw new Error(
        'Only a developer can list all organizations',
      );
    }

    const organizations = await this.organizationRepository.find({
      relations: ['users'],
      order: { createdAt: 'DESC' },
    });

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      type: org.type,
      mspId: org.mspId,
      peerEndpoint: org.peerEndpoint,
      createdAt: org.createdAt,
      users: org.users,
    }));
  }

  async updateOrganization(
    id: string,
    updateOrgDto: UpdateOrgDto,
    user: IAuthenticatedUser,
  ) {
    if (user.role !== Role.DEV) {
      throw new Error(
        'Only a developer can update an organization',
      );
    }

    const organization = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    Object.assign(organization, updateOrgDto);
    await this.organizationRepository.save(organization);

    return {
      message: 'Organization updated successfully',
      organization,
    };
  }
}
