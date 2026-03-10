import { IAuthenticatedUser } from '../auth/interfaces/authenticatedUser';
import { RegisterProductionDto } from './dto/RegisterProduction.dto';
import { AssetType } from './dto/enums/AssetType';
import { ForbiddenException, Inject } from '@nestjs/common';
import { ConnectionManager } from '../fabric/connectionManager';
import { ProductionBatch } from './dto/ProductionBatch.interface';

export class AssetsService {
  constructor(
    @Inject(ConnectionManager)
    private connectionManager: ConnectionManager,
  ) {}

  async registerProduction(
    user: IAuthenticatedUser,
    registerProductionDTO: RegisterProductionDto,
  ) {
    if (
      registerProductionDTO.assetType === AssetType.ELECTRICITY &&
      user.organization.id !== process.env.REE_ORG_ID
    ) {
      throw new ForbiddenException(
        'Only REE organization can register ELECTRICITY production.',
      );
    }

    if (
      registerProductionDTO.assetType === AssetType.H2 &&
      user.organization.id !== process.env.ENAGAS_GTS_ORG_ID
    ) {
      throw new ForbiddenException(
        'Only ENAGAS GTS organization can register H2 production.',
      );
    }
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.executeTransaction(
        gateway,
        client,
        'ProductionContract:RegisterProduction',
        registerProductionDTO.producerId,
        registerProductionDTO.assetType,
        registerProductionDTO.amount.toString(),
        registerProductionDTO.productionDate.toISOString(),
      );
      return result;
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }

  async getAllProductionBatches(
    user: IAuthenticatedUser,
  ): Promise<ProductionBatch[]> {
    const { gateway, client } =
      await this.connectionManager.connectGateway(user);
    try {
      const result = await this.connectionManager.queryTransaction(
        gateway,
        client,
        'ProductionContract:GetAllProductionBatches',
      );

      const resultString = Buffer.from(result).toString('utf8');

      if (!resultString || resultString.trim() === '') {
        return [];
      }

      return JSON.parse(resultString) as ProductionBatch[];
    } finally {
      this.connectionManager.disconnectGateway(gateway, client);
    }
  }
}
