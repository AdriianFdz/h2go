import { User } from "src/entities/user.entity";
import { RegisterProductionDto } from "./dto/RegisterProduction.dto";
import { AssetType } from "./dto/enums/AssetType";
import { Inject } from "@nestjs/common";
import { ConnectionManager } from "../fabric/connectionManager";
import { ProductionBatch } from "./dto/ProductionBatch.interface";

export class AssetsService {
    constructor(
        @Inject(ConnectionManager)
        private connectionManager: ConnectionManager,
    ) { }

    registerProduction(user: User, registerProductionDTO: RegisterProductionDto) {
        if (registerProductionDTO.assetType === AssetType.ELECTRICITY && user.organization.id !== process.env.CNMC_ORG_ID) {
            throw new Error('Only CNMC organization can register ELECTRICITY production.');
        }

        if (registerProductionDTO.assetType === AssetType.H2 && user.organization.id !== process.env.REE_ORG_ID) {
            throw new Error('Only REE organization can register H2 production.');
        }

        // TODO linking to the Fabric Network
    }

    async getAllProductionBatches(user: User): Promise<ProductionBatch[]> {
        const { gateway, client } = await this.connectionManager.connectGateway(user);
        try {
            const result = await this.connectionManager.queryTransaction(
                gateway,
                client,
                'ProductionContract:GetAllProductionBatches'
            );

            // Convertir correctamente el Buffer a string UTF-8
            const resultString = Buffer.from(result).toString('utf8');

            // Si está vacío o es null, devolver array vacío
            if (!resultString || resultString.trim() === '') {
                return [];
            }

            return JSON.parse(resultString) as ProductionBatch[];
        } finally {
            this.connectionManager.disconnectGateway(gateway, client);
        }
    }
}