import { DBProvider } from '../db/dbConnector';
import { IInventoryService, ITransferService } from '../interfaces/services';
import { InventoryService } from '../services/inventoryService';
import { TransferService } from '../services/transferService';
import { IInventoryServiceV2, InventoryServiceV2 } from '../services/inventoryServiceV2';
import { ITransferServiceV2, TransferServiceV2 } from '../services/transferServiceV2';
import { IWarehouseRegistryService, WarehouseRegistryService } from '../services/warehouseRegistryService';
import { WarehouseServiceFactory } from '../services/warehouseServices';
import { CostCalculatorService } from '../services/costCalculatorService';
import { TimeCalculatorService } from '../services/timeCalculatorService';
import { TransferStrategyFactory } from '../strategies/transferStrategies';
import { TransferStrategyFactoryV2 } from '../strategies/transferStrategiesV2';
import { CostCalculatorServiceV2, TimeCalculatorServiceV2 } from '../services/calculatorServiceV2';

export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.setupServices();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private setupServices(): void {
    // Core services
    const dbProvider = new DBProvider();
    const warehouseFactory = new WarehouseServiceFactory(dbProvider);
    const costCalculator = new CostCalculatorService();
    const timeCalculator = new TimeCalculatorService();
    const strategyFactory = new TransferStrategyFactory(costCalculator, timeCalculator);
    const warehouseRegistryService = new WarehouseRegistryService();

    // V2 calculators and strategies
    const costCalculatorV2 = new CostCalculatorServiceV2(warehouseRegistryService);
    const timeCalculatorV2 = new TimeCalculatorServiceV2(warehouseRegistryService);
    const strategyFactoryV2 = new TransferStrategyFactoryV2(costCalculatorV2, timeCalculatorV2);

    // Business services V1
    const inventoryService = new InventoryService(warehouseFactory);
    const transferService = new TransferService(inventoryService, warehouseFactory, strategyFactory);

    // Business services V2
    const inventoryServiceV2 = new InventoryServiceV2(warehouseRegistryService, dbProvider);
    const transferServiceV2 = new TransferServiceV2(inventoryServiceV2, strategyFactoryV2, warehouseRegistryService, dbProvider);

    // Register services
    this.services.set('DBProvider', dbProvider);
    this.services.set('WarehouseServiceFactory', warehouseFactory);
    this.services.set('CostCalculatorService', costCalculator);
    this.services.set('TimeCalculatorService', timeCalculator);
    this.services.set('TransferStrategyFactory', strategyFactory);
    this.services.set('WarehouseRegistryService', warehouseRegistryService);

    // V1 services
    this.services.set('InventoryService', inventoryService);
    this.services.set('TransferService', transferService);

    // V2 services
    this.services.set('InventoryServiceV2', inventoryServiceV2);
    this.services.set('TransferServiceV2', transferServiceV2);
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service as T;
  }

  getInventoryService(): IInventoryService {
    return this.get<IInventoryService>('InventoryService');
  }

  getTransferService(): ITransferService {
    return this.get<ITransferService>('TransferService');
  }

  getInventoryServiceV2(): IInventoryServiceV2 {
    return this.get<IInventoryServiceV2>('InventoryServiceV2');
  }

  getTransferServiceV2(): ITransferServiceV2 {
    return this.get<ITransferServiceV2>('TransferServiceV2');
  }

  getWarehouseRegistryService(): IWarehouseRegistryService {
    return this.get<IWarehouseRegistryService>('WarehouseRegistryService');
  }
}