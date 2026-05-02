import { Test, TestingModule } from '@nestjs/testing';
import { AssetsService } from '../../src/assets/assets.service';
import { ConnectionManager } from '../../src/fabric/connectionManager';
import { ForbiddenException } from '@nestjs/common';
import { AssetType } from '../../src/common/enums/assetType.enum';
import { IAuthenticatedUser } from 'src/auth/interfaces/authenticatedUser';

describe('AssetsService', () => {
  let service: AssetsService;
  let connectionManager: Record<string, jest.Mock>;

  const mockUser = {
    id: 'user-1',
    organization: { id: 'ree-org', mspId: 'ReeMSP', peerEndpoint: 'peer:443' },
  } as IAuthenticatedUser;

  beforeEach(async () => {
    process.env.REE_ORG_ID = 'ree-org';
    process.env.ENAGAS_GTS_ORG_ID = 'enagas-gts-org';

    connectionManager = {
      connectGateway: jest.fn().mockResolvedValue({ gateway: 'gw', client: 'cl' }),
      disconnectGateway: jest.fn(),
      queryTransaction: jest.fn(),
      executeTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: ConnectionManager, useValue: connectionManager },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerProduction', () => {
    it('should register ELECTRICITY production for REE org', async () => {
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from('result'));

      const dto = {
        producerId: 'p1',
        assetType: AssetType.ELECTRICITY,
        amount: 100,
        productionDate: new Date('2024-01-01'),
      };

      const result = await service.registerProduction(mockUser, dto);

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'ProductionContract:RegisterProduction',
        'p1', 'ELECTRICITY', '100', expect.any(String),
      );
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
      expect(result).toEqual(Buffer.from('result'));
    });

    it('should register H2 production for ENAGAS GTS org', async () => {
      const enagasUser = {
        ...mockUser,
        organization: { ...mockUser.organization, id: 'enagas-gts-org' },
      } as IAuthenticatedUser;
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from('result'));

      const dto = {
        producerId: 'p1',
        assetType: AssetType.H2,
        amount: 50,
        productionDate: new Date('2024-01-01'),
      };

      await service.registerProduction(enagasUser, dto);

      expect(connectionManager.executeTransaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-REE org tries ELECTRICITY', async () => {
      const otherUser = {
        ...mockUser,
        organization: { ...mockUser.organization, id: 'other-org' },
      } as IAuthenticatedUser;

      const dto = {
        producerId: 'p1',
        assetType: AssetType.ELECTRICITY,
        amount: 100,
        productionDate: new Date(),
      };

      await expect(
        service.registerProduction(otherUser, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-ENAGAS GTS org tries H2', async () => {
      const dto = {
        producerId: 'p1',
        assetType: AssetType.H2,
        amount: 50,
        productionDate: new Date(),
      };

      await expect(
        service.registerProduction(mockUser, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should call disconnectGateway in finally even when executeTransaction throws', async () => {
      connectionManager.executeTransaction.mockRejectedValue(new Error('fabric error'));

      const enagasUser = {
        ...mockUser,
        organization: { ...mockUser.organization, id: 'enagas-gts-org' },
      } as IAuthenticatedUser;
      const dto = {
        producerId: 'p1',
        assetType: AssetType.H2,
        amount: 50,
        productionDate: new Date('2024-01-01'),
      };

      await expect(service.registerProduction(enagasUser, dto)).rejects.toThrow('fabric error');
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
    });
  });

  describe('getAllProductionBatches', () => {
    it('should return parsed production batches', async () => {
      const mockData = [{ batchId: 'b1', producerId: 'p1' }];
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(mockData)),
      );

      const result = await service.getAllProductionBatches(mockUser);

      expect(result).toEqual(mockData);
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
    });

    it('should return empty array when result is empty', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getAllProductionBatches(mockUser);

      expect(result).toEqual([]);
    });

    it('should return empty array when result is whitespace', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from('   '));

      const result = await service.getAllProductionBatches(mockUser);

      expect(result).toEqual([]);
    });

    it('should call disconnectGateway in finally even when queryTransaction throws', async () => {
      connectionManager.queryTransaction.mockRejectedValue(new Error('query error'));

      await expect(service.getAllProductionBatches(mockUser)).rejects.toThrow('query error');
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
    });
  });
});
