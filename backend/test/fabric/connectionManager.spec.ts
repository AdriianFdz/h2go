import { ConnectionManager } from '../../src/fabric/connectionManager';

jest.mock('@grpc/grpc-js', () => ({
  credentials: {
    createSsl: jest.fn().mockReturnValue('mock-ssl-creds'),
  },
  Client: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
}));

jest.mock('@hyperledger/fabric-gateway', () => ({
  connect: jest.fn().mockReturnValue({
    close: jest.fn(),
    getNetwork: jest.fn().mockReturnValue({
      getContract: jest.fn().mockReturnValue({
        evaluateTransaction: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
        submitTransaction: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      }),
    }),
  }),
  signers: {
    newPrivateKeySigner: jest.fn().mockReturnValue('mock-signer'),
  },
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

jest.mock('crypto', () => ({
  createPrivateKey: jest.fn().mockReturnValue('mock-private-key'),
}));

import * as grpc from '@grpc/grpc-js';
import * as fabricGateway from '@hyperledger/fabric-gateway';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import { IAuthenticatedUser } from '../../src/auth/interfaces/authenticatedUser';
import { OrganizationType } from '../../src/common/enums/organizationType.enum';
import { Role } from '../../src/common/enums/role.enum';

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  const mockUser: IAuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test',
    role: Role.USER,
    createdAt: new Date('2026-01-01'),
    organization: {
      id: 'org-1',
      name: 'Org1',
      mspId: 'Org1msp',
      peerEndpoint: 'peer0-org1.default:443',
      type: OrganizationType.PRODUCER,
      createdAt: new Date('2026-01-01'),
      authorizedOrgs: [],
      authorizedByOrgs: [],
      users: [],
    },
  };

  beforeEach(() => {
    process.env.FABRIC_RESOURCES_PATH = '/tmp/fabric';
    process.env.FABRIC_CHANNEL_NAME = 'mychannel';
    process.env.FABRIC_CHAINCODE_NAME = 'mychaincode';

    manager = new ConnectionManager();

    (fs.readFile as jest.Mock).mockReset();
    (yaml.load as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connectGateway', () => {
    it('should connect to gateway successfully', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('cred-yaml-content')
        .mockResolvedValueOnce('network-yaml-content');

      (yaml.load as jest.Mock)
        .mockReturnValueOnce({
          cert: { pem: 'cert-pem-content' },
          key: { pem: 'key-pem-content' },
        })
        .mockReturnValueOnce({
          peers: {
            'org1-peer0.default': {
              tlsCACerts: { pem: 'tls-ca-cert-pem' },
            },
          },
        });

      const result = await manager.connectGateway(mockUser);

      expect(result.gateway).toBeDefined();
      expect(result.client).toBeDefined();
      expect(grpc.credentials.createSsl).toHaveBeenCalled();
      expect(fabricGateway.connect).toHaveBeenCalled();
    });

    it('should throw when TLS CA cert is not found for peer', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('cred-yaml-content')
        .mockResolvedValueOnce('network-yaml-content');

      (yaml.load as jest.Mock)
        .mockReturnValueOnce({
          cert: { pem: 'cert-pem-content' },
          key: { pem: 'key-pem-content' },
        })
        .mockReturnValueOnce({
          peers: {},
        });

      await expect(manager.connectGateway(mockUser)).rejects.toThrow(
        'TLS CA not found for peer',
      );
    });

    it('should throw when peer config has no tlsCACerts', async () => {
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('cred-yaml-content')
        .mockResolvedValueOnce('network-yaml-content');

      (yaml.load as jest.Mock)
        .mockReturnValueOnce({
          cert: { pem: 'cert-pem-content' },
          key: { pem: 'key-pem-content' },
        })
        .mockReturnValueOnce({
          peers: {
            'org1-peer0.default': {},
          },
        });

      await expect(manager.connectGateway(mockUser)).rejects.toThrow(
        'TLS CA not found for peer org1-peer0.default',
      );
    });
  });

  describe('disconnectGateway', () => {
    it('should close gateway and client', () => {
      const gatewayCloseMock = jest.fn();
      const gateway = { close: gatewayCloseMock } as unknown as fabricGateway.Gateway;

      const clientCloseMock = jest.fn();
      const client = { close: clientCloseMock } as unknown as grpc.Client;

      manager.disconnectGateway(gateway, client);

      expect(gatewayCloseMock).toHaveBeenCalled();
      expect(clientCloseMock).toHaveBeenCalled();
    });
  });

  describe('queryTransaction', () => {
    it('should evaluate transaction on the contract', async () => {
      const mockContract = {
        evaluateTransaction: jest.fn().mockResolvedValue(new Uint8Array([1, 2])),
      };
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue(mockContract),
      };
      const gatewayGetNetworkMock = jest.fn().mockReturnValue(mockNetwork);
      const gateway = {
        getNetwork: gatewayGetNetworkMock,
      } as unknown as fabricGateway.Gateway;
      const client = {} as unknown as grpc.Client;

      const result = await manager.queryTransaction(gateway, client, 'MyFunc', 'arg1', 'arg2');

      expect(gatewayGetNetworkMock).toHaveBeenCalledWith('mychannel');
      expect(mockNetwork.getContract).toHaveBeenCalledWith('mychaincode');
      expect(mockContract.evaluateTransaction).toHaveBeenCalledWith('MyFunc', 'arg1', 'arg2');
      expect(result).toEqual(new Uint8Array([1, 2]));
    });
  });

  describe('executeTransaction', () => {
    it('should submit transaction on the contract', async () => {
      const mockContract = {
        submitTransaction: jest.fn().mockResolvedValue(new Uint8Array([3, 4])),
      };
      const mockNetwork = {
        getContract: jest.fn().mockReturnValue(mockContract),
      };
      const gatewayGetNetworkMock = jest.fn().mockReturnValue(mockNetwork);
      const gateway = {
        getNetwork: gatewayGetNetworkMock,
      } as unknown as fabricGateway.Gateway;

      const result = await manager.executeTransaction(gateway, 'MyFunc', 'arg1');

      expect(mockContract.submitTransaction).toHaveBeenCalledWith('MyFunc', 'arg1');
      expect(result).toEqual(new Uint8Array([3, 4]));
    });
  });
});
