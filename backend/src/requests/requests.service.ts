import { Inject, Injectable } from '@nestjs/common';
import { ConnectionManager } from '../fabric/connectionManager';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { AssetType } from '../common/enums/asset-type.enum';
import { PendingRequestDto } from './dto/PendingRequest.dto';
import { CreateRequestDto } from './dto/CreateRequest.dto';
@Injectable()
export class RequestsService {
  constructor(
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
    @Inject('UserRepository')
    private userRepository,
  ) {}
  async getAllPendingRequests(user: IAuthenticatedUser) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }
    let assetType: AssetType;
    if (user.organization.id === process.env.CNMC_ORG_ID) {
      assetType = AssetType.ELECTRICITY;
    } else if (user.organization.id === process.env.ENAGAS_ORG_ID) {
      assetType = AssetType.H2;
    } else {
      throw new Error('User organization is not authorized to view requests.');
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RequestContract:GetRequestsByStatusAndAssetType',
        'PENDING',
        assetType,
      );
      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        return [];
      }

      const data = JSON.parse(resultString);
      return data.map((item: any) => ({
        docType: item.docType,
        requestId: item.requestId,
        producerId: item.producerId,
        assetType: item.assetType,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt,
      })) as PendingRequestDto[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async createRequest(
    user: IAuthenticatedUser,
    createRequestDto: CreateRequestDto,
  ) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const organization = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['organization', 'organization.authorizedByOrgs'],
    });

    const isAuthorized =
      organization?.organization?.authorizedByOrgs?.some(
        (org: any) => org.id === createRequestDto.producerId,
      ) || false;

    if (!isAuthorized) {
      throw new Error(
        'User is not authorized by the selected producer organization.',
      );
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      await this.connectionManager.executeTransaction(
        gateway,
        client,
        'RequestContract:CreateRequest',
        createRequestDto.producerId,
        createRequestDto.assetType,
        createRequestDto.amount.toString(),
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async approveRequest(
    user: IAuthenticatedUser,
    requestId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required to approve a request.');
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RequestContract:GetRequest',
        requestId,
      );

      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);
      const pendingRequest: PendingRequestDto = {
        docType: data.docType,
        requestId: data.requestId,
        producerId: data.producerId,
        assetType: data.assetType,
        amount: data.amount,
        status: data.status,
        createdAt: data.createdAt,
      };

      if (
        pendingRequest.assetType === 'ELECTRICITY' &&
        user.organization.id !== process.env.CNMC_ORG_ID
      ) {
        throw new Error('Only CNMC can approve electricity requests.');
      }
      if (
        pendingRequest.assetType === 'H2' &&
        user.organization.id !== process.env.ENAGAS_ORG_ID
      ) {
        throw new Error('Only Enagás can approve H2 requests.');
      }

      await this.connectionManager.executeTransaction(
        gateway,
        client,
        'RequestContract:ApproveRequest',
        requestId,
        reason,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async rejectRequest(
    user: IAuthenticatedUser,
    requestId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required to reject a request.');
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RequestContract:GetRequest',
        requestId,
      );

      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);
      const pendingRequest: PendingRequestDto = {
        docType: data.docType,
        requestId: data.requestId,
        producerId: data.producerId,
        assetType: data.assetType,
        amount: data.amount,
        status: data.status,
        createdAt: data.createdAt,
      };

      if (
        pendingRequest.assetType === 'ELECTRICITY' &&
        user.organization.id !== process.env.CNMC_ORG_ID
      ) {
        throw new Error('Only CNMC can reject electricity requests.');
      }
      if (
        pendingRequest.assetType === 'H2' &&
        user.organization.id !== process.env.ENAGAS_ORG_ID
      ) {
        throw new Error('Only Enagás can reject H2 requests.');
      }

      await this.connectionManager.executeTransaction(
        gateway,
        client,
        'RequestContract:RejectRequest',
        requestId,
        reason,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async validateRequest(user: IAuthenticatedUser, requestId: string) {
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RequestContract:QuickValidateRequest',
        requestId,
      );
      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);
      return { canApprove: data.canApprove };
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }
}
