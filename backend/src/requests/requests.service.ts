import { Inject, Injectable } from '@nestjs/common';
import { ConnectionManager } from '../fabric/connectionManager';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { AssetType } from '../common/enums/assetType.enum';
import { PendingIssuanceRequestDto } from './dto/pendingIssuanceRequest.dto';
import { CreateIssuanceRequestDto } from './dto/createIssuanceRequest.dto';
import { CreateTradeRequestDto } from './dto/createTradeRequest.dto';
import { PendingTradeRequestDto } from './dto/pendingTradeRequest.dto';
@Injectable()
export class RequestsService {
  constructor(
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
    @Inject('UserRepository')
    private userRepository,
  ) {}

  async createIssuanceRequest(
    user: IAuthenticatedUser,
    createRequestDto: CreateIssuanceRequestDto,
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
      const result = await this.connectionManager.executeTransaction(
        gateway,
        'RequestContract:CreateRequest',
        createRequestDto.producerId,
        createRequestDto.assetType,
        createRequestDto.amount.toString(),
      );
      return { requestId: Buffer.from(result).toString('utf8') };
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async getAllPendingIssuanceRequests(user: IAuthenticatedUser) {
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
      })) as PendingIssuanceRequestDto[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async approveIssuanceRequest(
    user: IAuthenticatedUser,
    requestId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required to approve a issuance request.');
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RequestContract:GetRequest',
        requestId,
      );

      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);
      const pendingRequest: PendingIssuanceRequestDto = {
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
        'RequestContract:ApproveRequest',
        requestId,
        reason,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async rejectIssuanceRequest(
    user: IAuthenticatedUser,
    requestId: string,
    reason: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reason is required to reject a issuance request.');
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RequestContract:GetRequest',
        requestId,
      );

      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);
      const pendingRequest: PendingIssuanceRequestDto = {
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
        'RequestContract:RejectRequest',
        requestId,
        reason,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async validateIssuanceRequest(user: IAuthenticatedUser, requestId: string) {
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RequestContract:QuickValidateIssuanceRequest',
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

  async createTradeRequest(
    user: IAuthenticatedUser,
    createTradeRequestDto: CreateTradeRequestDto,
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
        (org: any) => org.id === createTradeRequestDto.sourceProducerID,
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
        'RedemptionContract:CreateTradeRequest',
        createTradeRequestDto.sourceProducerID,
        createTradeRequestDto.targetProducerID,
        createTradeRequestDto.assetType,
        createTradeRequestDto.amount.toString(),
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async getIncomingTradeRequests(
    user: IAuthenticatedUser,
    producerId: string,
  ) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RedemptionContract:GetReceivedTradeRequestsByStatus',
        producerId,
        'PENDING',
      );
      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        return [];
      }

      const data = JSON.parse(resultString);
      return data.map((item: any) => ({
        docType: item.docType,
        tradeID: item.tradeID,
        producerID: item.producerID,
        targetID: item.targetID,
        assetType: item.assetType,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt,
      })) as PendingTradeRequestDto[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async approveTradeRequest(
    user: IAuthenticatedUser,
    tradeId: string,
    gdoIds: string[],
  ) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const organization = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['organization', 'organization.authorizedByOrgs'],
    });

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const tradeResult = await this.connectionManager.queryTransaction(
        gateway,
        'RedemptionContract:GetTradeRequest',
        tradeId,
      );
      const tradeString = Buffer.from(tradeResult).toString('utf8');
      if (!tradeString || tradeString.trim() === '') {
        throw new Error('Trade request not found.');
      }
      const tradeRequest = JSON.parse(tradeString) as PendingTradeRequestDto;

      const isAuthorized =
        organization?.organization?.authorizedByOrgs?.some(
          (org: any) => org.id === tradeRequest.producerID,
        ) || false;

      if (!isAuthorized) {
        throw new Error(
          'User is not authorized by the requesting producer organization.',
        );
      }

      const gdoIdsJson = JSON.stringify(gdoIds);
      await this.connectionManager.executeTransaction(
        gateway,
        'RedemptionContract:AcceptTradeRequest',
        tradeRequest.targetID,
        tradeId,
        gdoIdsJson,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async getOngoingIssuanceRequests(
    user: IAuthenticatedUser,
    producerId: string,
  ) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RequestContract:GetRequestsByProducer',
        producerId,
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
        approverId: item.approverId,
        reason: item.reason,
        gdos: item.gdos ?? [],
        createdAt: item.createdAt,
        processedAt: item.processedAt,
      })) as PendingIssuanceRequestDto[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async cancelIssuanceRequest(user: IAuthenticatedUser, requestId: string) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RequestContract:GetRequest',
        requestId,
      );
      const resultString = Buffer.from(result).toString('utf8');
      if (!resultString || resultString.trim() === '') {
        throw new Error('Request not found.');
      }
      const data = JSON.parse(resultString);

      const organization = await this.userRepository.findOne({
        where: { id: user.id },
        relations: ['organization', 'organization.authorizedByOrgs'],
      });

      const isAuthorized =
        organization?.organization?.authorizedByOrgs?.some(
          (org: any) => org.id === data.producerId,
        ) || false;

      if (!isAuthorized) {
        throw new Error(
          'User is not authorized to cancel this request.',
        );
      }

      if (data.status !== 'PENDING') {
        throw new Error('Only PENDING requests can be cancelled.');
      }

      await this.connectionManager.executeTransaction(
        gateway,
        'RequestContract:CancelRequest',
        requestId,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async getOngoingTradeRequests(
    user: IAuthenticatedUser,
    producerId: string,
  ) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        'RedemptionContract:GetSentTradeRequestsByStatus',
        producerId,
        'PENDING',
      );
      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        return [];
      }

      const data = JSON.parse(resultString);
      return data.map((item: any) => ({
        docType: item.docType,
        tradeID: item.tradeID,
        producerID: item.producerID,
        targetID: item.targetID,
        assetType: item.assetType,
        amount: item.amount,
        status: item.status,
        createdAt: item.createdAt,
      })) as PendingTradeRequestDto[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async rejectTradeRequest(user: IAuthenticatedUser, tradeId: string) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }

    const organization = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['organization', 'organization.authorizedByOrgs'],
    });

    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const tradeResult = await this.connectionManager.queryTransaction(
        gateway,
        'RedemptionContract:GetTradeRequest',
        tradeId,
      );
      const tradeString = Buffer.from(tradeResult).toString('utf8');
      if (!tradeString || tradeString.trim() === '') {
        throw new Error('Trade request not found.');
      }
      const tradeRequest = JSON.parse(tradeString) as PendingTradeRequestDto;

      const isAuthorized =
        organization?.organization?.authorizedByOrgs?.some(
          (org: any) => org.id === tradeRequest.producerID,
        ) || false;

      if (!isAuthorized) {
        throw new Error(
          'User is not authorized by the requesting producer organization.',
        );
      }

      await this.connectionManager.executeTransaction(
        gateway,
        'RedemptionContract:RejectTradeRequest',
        tradeRequest.targetID,
        tradeId,
      );
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }
}
