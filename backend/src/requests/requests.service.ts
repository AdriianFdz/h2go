import { Inject, Injectable } from '@nestjs/common';
import { ConnectionManager } from '../fabric/connectionManager';
import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';

@Injectable()
export class RequestsService {
  constructor(
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
  ) {}
  async getAllPendingRequests(user: IAuthenticatedUser) {
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'RequestContract:GetRequestsByStatus',
        'PENDING',
      );
      return result;
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }
}
