import { Test, TestingModule } from '@nestjs/testing';
import { AssetsController } from '../../src/assets/assets.controller';
import { AssetsService } from '../../src/assets/assets.service';
import { AssetType } from '../../src/common/enums/asset-type.enum';
import { GdO } from '../../src/assets/dto/gdoBalance.dto';

describe('AssetsController', () => {
  let controller: AssetsController;
  let assetsService: any;
  let gdo1: GdO;
  let gdo2: GdO;

  beforeEach(async () => {
    gdo1 = {
      gdoId: 'gdo1',
      requestId: 'req1',
      assetType: AssetType.ELECTRICITY,
      issueDate: "2027-01-26T19:50:00Z",
      expiryDate: "2028-01-26T19:50:00Z",
      ownerId: "owner1",
      status: "AVAILABLE"
    } as GdO

    gdo2 = {
      gdoId: 'gdo2',
      requestId: 'req2',
      assetType: AssetType.ELECTRICITY,
      issueDate: "2026-01-26T19:50:00Z",
      expiryDate: "2027-01-26T19:50:00Z",
      ownerId: "owner2",
      status: "AVAILABLE"
    } as GdO
    
    assetsService = {
      registerProduction: jest.fn().mockResolvedValue({ message: 'ok' }),
      getAllProductionBatches: jest.fn().mockResolvedValue([gdo1, gdo2]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [{ provide: AssetsService, useValue: assetsService }],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  describe('registerProduction', () => {
    it('should delegate to service with user and body', async () => {
      const user = { id: 'u1', organization: { id: 'org-1' } };
      const req = { user };
      const body = {
        producerId: 'p1',
        assetType: AssetType.ELECTRICITY,
        amount: 100,
        productionDate: new Date(),
      };

      await controller.registerProduction(req as any, body);

      expect(assetsService.registerProduction).toHaveBeenCalledWith(user, body);
    });
  });

  describe('getAllProductionBatches', () => {
    it('should delegate to service with user', async () => {
      const user = { id: 'u1', organization: { id: 'org-1' } };
      const req = { user };

      const result = await controller.getAllProductionBatches(req);

      expect(assetsService.getAllProductionBatches).toHaveBeenCalledWith(user);
      expect(result).toEqual([gdo1, gdo2]);
    });
  });
});
