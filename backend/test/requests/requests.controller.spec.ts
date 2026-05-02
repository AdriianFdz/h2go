import { Test, TestingModule } from '@nestjs/testing';
import { RequestsController } from '../../src/requests/requests.controller';
import { RequestsService } from '../../src/requests/requests.service';
import { Role } from '../../src/common/enums/role.enum';
import { AssetType } from '../../src/common/enums/assetType.enum';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';

import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { Organization } from '../../src/entities/organization.entity';
import { CreateIssuanceRequestDto } from '../../src/requests/dto/createIssuanceRequest.dto';
import { CreateTradeRequestDto } from '../../src/requests/dto/createTradeRequest.dto';
import { ApproveTradeRequestDto } from '../../src/requests/dto/approveTradeRequest.dto';

describe('RequestsController', () => {
  let controller: RequestsController;
  let requestsService: jest.Mocked<
    Pick<
      RequestsService,
      | 'createIssuanceRequest'
      | 'getAllPendingIssuanceRequests'
      | 'getOngoingIssuanceRequests'
      | 'approveIssuanceRequest'
      | 'rejectIssuanceRequest'
      | 'cancelIssuanceRequest'
      | 'validateIssuanceRequest'
      | 'createTradeRequest'
      | 'getOngoingTradeRequests'
      | 'getIncomingTradeRequests'
      | 'approveTradeRequest'
      | 'rejectTradeRequest'
    >
  >;

  const mockOrganization = {
    id: 'org-1',
    name: 'Org1',
    mspId: 'Org1MSP',
    peerEndpoint: 'peer0.org1:443',
    type: OrganizationType.PRODUCER,
    createdAt: new Date('2026-01-01'),
    authorizedOrgs: [],
    authorizedByOrgs: [],
    users: [],
  } as unknown as Organization;

  const mockUser = {
    id: 'user-1',
    role: Role.USER,
    organization: mockOrganization,
  } as unknown as IAuthenticatedUser;

  const mockIssuanceRequest = {
    docType: 'request',
    requestId: 'req-1',
    producerId: 'p1',
    assetType: AssetType.ELECTRICITY,
    amount: 100,
    status: 'PENDING',
    createdAt: '2026-01-01',
  };

  const mockTradeRequest = {
    docType: 'trade',
    tradeID: 't1',
    producerID: 'p1',
    targetID: 'p2',
    assetType: AssetType.H2,
    amount: 10,
    status: 'PENDING',
    createdAt: '2026-01-01',
  };

  beforeEach(async () => {
    requestsService = {
      createIssuanceRequest: jest.fn().mockResolvedValue(undefined),
      getAllPendingIssuanceRequests: jest.fn().mockResolvedValue([mockIssuanceRequest]),
      getOngoingIssuanceRequests: jest.fn().mockResolvedValue([mockIssuanceRequest]),
      approveIssuanceRequest: jest.fn().mockResolvedValue(undefined),
      rejectIssuanceRequest: jest.fn().mockResolvedValue(undefined),
      cancelIssuanceRequest: jest.fn().mockResolvedValue(undefined),
      validateIssuanceRequest: jest.fn().mockResolvedValue({ canApprove: true }),
      createTradeRequest: jest.fn().mockResolvedValue(undefined),
      getOngoingTradeRequests: jest.fn().mockResolvedValue([mockTradeRequest]),
      getIncomingTradeRequests: jest.fn().mockResolvedValue([mockTradeRequest]),
      approveTradeRequest: jest.fn().mockResolvedValue(undefined),
      rejectTradeRequest: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        { provide: RequestsService, useValue: requestsService },
      ],
    }).compile();

    controller = module.get<RequestsController>(RequestsController);
  });

  describe('createRequest', () => {
    it('should delegate to service', async () => {
      const dto: CreateIssuanceRequestDto = { producerId: 'p1', assetType: AssetType.ELECTRICITY, amount: 100 };
      const req = { user: mockUser };

      const result = await controller.createRequest(req, dto);

      expect(requestsService.createIssuanceRequest).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('getAllPendingIssuanceRequests', () => {
    it('should delegate to service', async () => {
      const req = { user: mockUser };

      const result = await controller.getAllPendingIssuanceRequests(req);

      expect(requestsService.getAllPendingIssuanceRequests).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([mockIssuanceRequest]);
    });
  });

  describe('getOngoingIssuanceRequests', () => {
    it('should delegate to service with producerId', async () => {
      const req = { user: mockUser };

      const result = await controller.getOngoingIssuanceRequests(req, 'prod-1');

      expect(requestsService.getOngoingIssuanceRequests).toHaveBeenCalledWith(mockUser, 'prod-1');
      expect(result).toEqual([mockIssuanceRequest]);
    });
  });

  describe('approveRequest', () => {
    it('should delegate to service with id and comment', async () => {
      const req = { user: mockUser };

      const result = await controller.approveRequest(req, 'req-1', 'Looks good');

      expect(requestsService.approveIssuanceRequest).toHaveBeenCalledWith(
        mockUser, 'req-1', 'Looks good',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('rejectRequest', () => {
    it('should delegate to service with id and comment', async () => {
      const req = { user: mockUser };

      const result = await controller.rejectRequest(req, 'req-1', 'Insufficient data');

      expect(requestsService.rejectIssuanceRequest).toHaveBeenCalledWith(
        mockUser, 'req-1', 'Insufficient data',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('cancelRequest', () => {
    it('should delegate to service with id', async () => {
      const req = { user: mockUser };

      const result = await controller.cancelRequest(req, 'req-1');

      expect(requestsService.cancelIssuanceRequest).toHaveBeenCalledWith(mockUser, 'req-1');
      expect(result).toBeUndefined();
    });
  });

  describe('validateRequest', () => {
    it('should delegate to service with id', async () => {
      const req = { user: mockUser };

      const result = await controller.validateRequest(req, 'req-1');

      expect(requestsService.validateIssuanceRequest).toHaveBeenCalledWith(mockUser, 'req-1');
      expect(result).toEqual({ canApprove: true });
    });
  });

  describe('createTradeRequest', () => {
    it('should delegate to service', async () => {
      const dto: CreateTradeRequestDto = { sourceProducerID: 'p1', targetProducerID: 'p2', assetType: AssetType.H2, amount: 50 };
      const req = { user: mockUser };

      const result = await controller.createTradeRequest(req, dto);

      expect(requestsService.createTradeRequest).toHaveBeenCalledWith(mockUser, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('getOngoingTradeRequests', () => {
    it('should delegate to service with producerId', async () => {
      const req = { user: mockUser };

      const result = await controller.getOngoingTradeRequests(req, 'prod-1');

      expect(requestsService.getOngoingTradeRequests).toHaveBeenCalledWith(mockUser, 'prod-1');
      expect(result).toEqual([mockTradeRequest]);
    });
  });

  describe('getIncomingTradeRequests', () => {
    it('should delegate to service with producerId', async () => {
      const req = { user: mockUser };

      const result = await controller.getIncomingTradeRequests(req, 'prod-1');

      expect(requestsService.getIncomingTradeRequests).toHaveBeenCalledWith(mockUser, 'prod-1');
      expect(result).toEqual([mockTradeRequest]);
    });
  });

  describe('approveTradeRequest', () => {
    it('should delegate to service with id and gdoIds', async () => {
      const req = { user: mockUser };
      const body: ApproveTradeRequestDto = { gdoIds: ['gdo-1', 'gdo-2'] };

      const result = await controller.approveTradeRequest(req, 't1', body);

      expect(requestsService.approveTradeRequest).toHaveBeenCalledWith(
        mockUser, 't1', ['gdo-1', 'gdo-2'],
      );
      expect(result).toBeUndefined();
    });
  });

  describe('rejectTradeRequest', () => {
    it('should delegate to service with id', async () => {
      const req = { user: mockUser };

      const result = await controller.rejectTradeRequest(req, 't1');

      expect(requestsService.rejectTradeRequest).toHaveBeenCalledWith(mockUser, 't1');
      expect(result).toBeUndefined();
    });
  });
});
