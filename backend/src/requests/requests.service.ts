import { Inject, Injectable } from '@nestjs/common';
import { ConnectionManager } from '../fabric/connectionManager';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { AssetType } from 'src/assets/dto/enums/AssetType';
import { PendingRequestDto } from './dto/PendingRequest.dto';
@Injectable()
export class RequestsService {
  constructor(
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
  ) {}
  async getAllPendingRequests(user: IAuthenticatedUser) {
    if (!user.organization) {
      throw new Error('User does not have an associated organization.');
    }
    let assetType: string;
    if (user.organization.id === process.env.CNMC_ORG_ID) {
      assetType = AssetType.ELECTRICITY as string;
    } else if (user.organization.id === process.env.ENAGAS_ORG_ID) {
      assetType = AssetType.H2 as string;
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
}
