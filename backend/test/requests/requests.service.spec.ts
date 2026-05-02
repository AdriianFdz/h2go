import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from '../../src/requests/requests.service';
import { ConnectionManager } from '../../src/fabric/connectionManager';
import { AssetType } from '../../src/common/enums/assetType.enum';
import { Role } from '../../src/common/enums/role.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { Repository } from 'typeorm';
import { User } from '../../src/entities/user.entity';
import { CreateIssuanceRequestDto } from '../../src/requests/dto/createIssuanceRequest.dto';
import { CreateTradeRequestDto } from '../../src/requests/dto/createTradeRequest.dto';
import { Organization } from '../../src/entities/organization.entity';

describe('RequestsService', () => {
  let service: RequestsService;
  let connectionManager: jest.Mocked<Pick<ConnectionManager, 'connectGateway' | 'disconnectGateway' | 'queryTransaction' | 'executeTransaction'>>;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;

  const mockProducerOrganization = {
    id: 'prod-1',
    name: 'ProdOrg',
    mspId: 'ProdMSP',
    peerEndpoint: 'peer:443',
    type: OrganizationType.PRODUCER,
    createdAt: new Date('2026-01-01'),
    authorizedOrgs: [],
    authorizedByOrgs: [],
    users: [],
  } as unknown as Organization;

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    role: Role.USER,
    organization: {
      id: 'org-1',
      name: 'TraderOrg',
      mspId: 'TraderMSP',
      peerEndpoint: 'peer:443',
      type: OrganizationType.TRADER,
    },
  } as unknown as IAuthenticatedUser;

  const mockUserNoOrg = {
    id: 'user-2',
    email: 'noorg@example.com',
    name: 'No Org User',
    role: Role.USER,
    organization: null,
  } as unknown as IAuthenticatedUser;

  const cnmcUser = {
    ...mockUser,
    organization: { ...mockUser.organization, id: 'cnmc-id' },
  } as unknown as IAuthenticatedUser;

  const enagasUser = {
    ...mockUser,
    organization: { ...mockUser.organization, id: 'enagas-id' },
  } as unknown as IAuthenticatedUser;

  beforeEach(async () => {
    process.env.CNMC_ORG_ID = 'cnmc-id';
    process.env.ENAGAS_ORG_ID = 'enagas-id';

    connectionManager = {
      connectGateway: jest.fn().mockResolvedValue({ gateway: 'gw', client: 'cl' }),
      disconnectGateway: jest.fn(),
      queryTransaction: jest.fn(),
      executeTransaction: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        { provide: ConnectionManager, useValue: connectionManager },
        { provide: 'UserRepository', useValue: userRepository },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createIssuanceRequest', () => {
    const dto = { producerId: 'prod-1', assetType: AssetType.ELECTRICITY, amount: 100 };

    it('should create issuance request when user is authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.createIssuanceRequest(mockUser, dto as CreateIssuanceRequestDto);

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:CreateRequest', 'prod-1', 'ELECTRICITY', '100',
      );
      expect(connectionManager.disconnectGateway).toHaveBeenCalled();
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.createIssuanceRequest(mockUserNoOrg, dto as CreateIssuanceRequestDto),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should throw when user is not authorized by producer', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [] } as unknown as Organization,
      } as unknown as User);

      await expect(
        service.createIssuanceRequest(mockUser, dto as CreateIssuanceRequestDto),
      ).rejects.toThrow('User is not authorized by the selected producer organization.');
    });
  });

  describe('getAllPendingIssuanceRequests', () => {
    it('should return pending requests for CNMC org with ELECTRICITY type', async () => {
      const mockData = [
        { docType: 'request', requestId: 'req-1', producerId: 'p1', assetType: 'ELECTRICITY', amount: 100, status: 'PENDING', createdAt: '2026-01-01' },
      ];
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(mockData)),
      );

      const result = await service.getAllPendingIssuanceRequests(cnmcUser);

      expect(result).toHaveLength(1);
      expect(connectionManager.queryTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:GetRequestsByStatusAndAssetType', 'PENDING', AssetType.ELECTRICITY,
      );
    });

    it('should return pending requests for Enagás org with H2 type', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify([])),
      );

      await service.getAllPendingIssuanceRequests(enagasUser);

      expect(connectionManager.queryTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:GetRequestsByStatusAndAssetType', 'PENDING', AssetType.H2,
      );
    });

    it('should throw when organization is not CNMC or Enagás', async () => {
      await expect(
        service.getAllPendingIssuanceRequests(mockUser),
      ).rejects.toThrow('User organization is not authorized to view requests.');
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.getAllPendingIssuanceRequests(mockUserNoOrg),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should return empty array when result is empty', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getAllPendingIssuanceRequests(cnmcUser);

      expect(result).toEqual([]);
    });
  });

  describe('approveIssuanceRequest', () => {
    it('should approve when CNMC approves ELECTRICITY request', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'ELECTRICITY', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.approveIssuanceRequest(cnmcUser, 'req-1', 'Approved');

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:ApproveRequest', 'req-1', 'Approved',
      );
    });

    it('should throw when reason is empty', async () => {
      await expect(
        service.approveIssuanceRequest(cnmcUser, 'req-1', ''),
      ).rejects.toThrow('Reason is required to approve a issuance request.');
    });

    it('should throw when non-CNMC tries to approve ELECTRICITY request', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'ELECTRICITY', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );

      await expect(
        service.approveIssuanceRequest(enagasUser, 'req-1', 'Approved'),
      ).rejects.toThrow('Only CNMC can approve electricity requests.');
    });

    it('should throw when non-Enagás tries to approve H2 request', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'H2', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );

      await expect(
        service.approveIssuanceRequest(cnmcUser, 'req-1', 'Approved'),
      ).rejects.toThrow('Only Enagás can approve H2 requests.');
    });

    it('should throw when request not found (empty result)', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.approveIssuanceRequest(cnmcUser, 'req-1', 'Approved'),
      ).rejects.toThrow('Request not found.');
    });

    it('should approve H2 request when user is Enagás', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'H2', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.approveIssuanceRequest(enagasUser, 'req-1', 'Approved');

      expect(connectionManager.executeTransaction).toHaveBeenCalled();
    });
  });

  describe('rejectIssuanceRequest', () => {
    it('should reject ELECTRICITY request when user is CNMC', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'ELECTRICITY', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.rejectIssuanceRequest(cnmcUser, 'req-1', 'Rejected');

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:RejectRequest', 'req-1', 'Rejected',
      );
    });

    it('should throw when reason is empty', async () => {
      await expect(
        service.rejectIssuanceRequest(cnmcUser, 'req-1', ''),
      ).rejects.toThrow('Reason is required to reject a issuance request.');
    });

    it('should throw when non-CNMC tries to reject ELECTRICITY request', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'ELECTRICITY', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );

      await expect(
        service.rejectIssuanceRequest(enagasUser, 'req-1', 'Rejected'),
      ).rejects.toThrow('Only CNMC can reject electricity requests.');
    });

    it('should throw when non-Enagás tries to reject H2 request', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'H2', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );

      await expect(
        service.rejectIssuanceRequest(cnmcUser, 'req-1', 'Rejected'),
      ).rejects.toThrow('Only Enagás can reject H2 requests.');
    });

    it('should throw when request not found (empty result)', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.rejectIssuanceRequest(cnmcUser, 'req-1', 'Rejected'),
      ).rejects.toThrow('Request not found.');
    });

    it('should reject H2 request when user is Enagás', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'H2', amount: 100, status: 'PENDING', createdAt: '2026-01-01',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.rejectIssuanceRequest(enagasUser, 'req-1', 'Rejected');

      expect(connectionManager.executeTransaction).toHaveBeenCalled();
    });
  });

  describe('validateIssuanceRequest', () => {
    it('should return validation result', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({ canApprove: true })),
      );

      const result = await service.validateIssuanceRequest(mockUser, 'req-1');

      expect(result).toEqual({ canApprove: true });
    });

    it('should throw when request not found (empty result)', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.validateIssuanceRequest(mockUser, 'req-1'),
      ).rejects.toThrow('Request not found.');
    });
  });

  describe('cancelIssuanceRequest', () => {
    it('should cancel a PENDING request when user is authorized', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({ producerId: 'prod-1', status: 'PENDING' })),
      );
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.cancelIssuanceRequest(mockUser, 'req-1');

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RequestContract:CancelRequest', 'req-1',
      );
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.cancelIssuanceRequest(mockUserNoOrg, 'req-1'),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should throw when user is not authorized', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({ producerId: 'prod-1', status: 'PENDING' })),
      );
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [] } as unknown as Organization,
      } as unknown as User);

      await expect(
        service.cancelIssuanceRequest(mockUser, 'req-1'),
      ).rejects.toThrow('User is not authorized to cancel this request.');
    });

    it('should throw when request is not PENDING', async () => {
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({ producerId: 'prod-1', status: 'APPROVED' })),
      );
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);

      await expect(
        service.cancelIssuanceRequest(mockUser, 'req-1'),
      ).rejects.toThrow('Only PENDING requests can be cancelled.');
    });

    it('should throw when request not found (empty result)', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.cancelIssuanceRequest(mockUser, 'req-1'),
      ).rejects.toThrow('Request not found.');
    });
  });

  describe('createTradeRequest', () => {
    const dto = {
      sourceProducerID: 'prod-1',
      targetProducerID: 'prod-2',
      assetType: AssetType.H2,
      amount: 50,
    };

    it('should create trade request when authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.createTradeRequest(mockUser, dto as CreateTradeRequestDto);

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RedemptionContract:CreateTradeRequest', 'prod-1', 'prod-2', 'H2', '50',
      );
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.createTradeRequest(mockUserNoOrg, dto as CreateTradeRequestDto),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should throw when user is not authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [] } as unknown as Organization,
      } as unknown as User);

      await expect(
        service.createTradeRequest(mockUser, dto as CreateTradeRequestDto),
      ).rejects.toThrow('User is not authorized by the selected producer organization.');
    });
  });

  describe('getIncomingTradeRequests', () => {
    it('should return incoming trade requests', async () => {
      const mockData = [
        { docType: 'trade', tradeID: 't1', producerID: 'p1', targetID: 'p2', assetType: 'H2', amount: 10, status: 'PENDING', createdAt: '2026-01-01' },
      ];
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(mockData)),
      );

      const result = await service.getIncomingTradeRequests(mockUser, 'prod-1');

      expect(result).toHaveLength(1);
      expect(result[0].tradeID).toBe('t1');
    });

    it('should return empty array when no results', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getIncomingTradeRequests(mockUser, 'prod-1');

      expect(result).toEqual([]);
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.getIncomingTradeRequests(mockUserNoOrg, 'prod-1'),
      ).rejects.toThrow('User does not have an associated organization.');
    });
  });

  describe('getOngoingTradeRequests', () => {
    it('should return ongoing trade requests', async () => {
      const mockData = [
        { docType: 'trade', tradeID: 't1', producerID: 'p1', targetID: 'p2', assetType: 'H2', amount: 10, status: 'PENDING', createdAt: '2026-01-01' },
      ];
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(mockData)),
      );

      const result = await service.getOngoingTradeRequests(mockUser, 'prod-1');

      expect(result).toHaveLength(1);
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.getOngoingTradeRequests(mockUserNoOrg, 'prod-1'),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should return empty array when result is empty', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getOngoingTradeRequests(mockUser, 'prod-1');
      expect(result).toEqual([]);
    });
  });

  describe('approveTradeRequest', () => {
    it('should approve trade request when authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          tradeID: 't1', producerID: 'prod-1', targetID: 'prod-2', status: 'PENDING',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.approveTradeRequest(mockUser, 't1', ['gdo-1', 'gdo-2']);

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RedemptionContract:AcceptTradeRequest', 'prod-2', 't1', '["gdo-1","gdo-2"]',
      );
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.approveTradeRequest(mockUserNoOrg, 't1', ['gdo-1']),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should throw when trade request not found', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.approveTradeRequest(mockUser, 't1', ['gdo-1']),
      ).rejects.toThrow('Trade request not found.');
    });

    it('should throw when user is not authorized by producer', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          tradeID: 't1', producerID: 'prod-1', targetID: 'prod-2', status: 'PENDING',
        })),
      );

      await expect(
        service.approveTradeRequest(mockUser, 't1', ['gdo-1']),
      ).rejects.toThrow('User is not authorized by the requesting producer organization.');
    });
  });

  describe('rejectTradeRequest', () => {
    it('should reject trade request when authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          tradeID: 't1', producerID: 'prod-1', targetID: 'prod-2', status: 'PENDING',
        })),
      );
      connectionManager.executeTransaction.mockResolvedValue(Buffer.from(''));

      await service.rejectTradeRequest(mockUser, 't1');

      expect(connectionManager.executeTransaction).toHaveBeenCalledWith(
        'gw', 'RedemptionContract:RejectTradeRequest', 'prod-2', 't1',
      );
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.rejectTradeRequest(mockUserNoOrg, 't1'),
      ).rejects.toThrow('User does not have an associated organization.');
    });

    it('should throw when user is not authorized', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify({
          tradeID: 't1', producerID: 'prod-1', targetID: 'prod-2', status: 'PENDING',
        })),
      );

      await expect(
        service.rejectTradeRequest(mockUser, 't1'),
      ).rejects.toThrow('User is not authorized by the requesting producer organization.');
    });

    it('should throw when trade request not found', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        organization: { ...mockProducerOrganization, authorizedByOrgs: [mockProducerOrganization] } as unknown as Organization,
      } as unknown as User);
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      await expect(
        service.rejectTradeRequest(mockUser, 't1'),
      ).rejects.toThrow('Trade request not found.');
    });
  });

  describe('getOngoingIssuanceRequests', () => {
    it('should return ongoing issuance requests', async () => {
      const mockData = [
        {
          docType: 'request', requestId: 'req-1', producerId: 'p1',
          assetType: 'ELECTRICITY', amount: 100, status: 'PENDING',
          createdAt: '2026-01-01',
        },
      ];
      connectionManager.queryTransaction.mockResolvedValue(
        Buffer.from(JSON.stringify(mockData)),
      );

      const result = await service.getOngoingIssuanceRequests(mockUser, 'prod-1');

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe('req-1');
      expect((result[0] as any).gdos).toEqual([]);
    });

    it('should return empty array when no results', async () => {
      connectionManager.queryTransaction.mockResolvedValue(Buffer.from(''));

      const result = await service.getOngoingIssuanceRequests(mockUser, 'prod-1');

      expect(result).toEqual([]);
    });

    it('should throw when user has no organization', async () => {
      await expect(
        service.getOngoingIssuanceRequests(mockUserNoOrg, 'prod-1'),
      ).rejects.toThrow('User does not have an associated organization.');
    });
  });
});
