import { DBProvider } from '../db/dbConnector';
import { IInventoryService, ITransferService } from '../interfaces/services';
import { InventoryService } from '../services/inventoryService';
import { TransferService } from '../services/transferService';
import { WarehouseServiceFactory } from '../services/warehouseServices';
import { CostCalculatorService } from '../services/costCalculatorService';
import { TimeCalculatorService } from '../services/timeCalculatorService';
import { TransferStrategyFactory } from '../strategies/transferStrategies';

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

    // Business services
    const inventoryService = new InventoryService(warehouseFactory);
    const transferService = new TransferService(inventoryService, warehouseFactory, strategyFactory);

    // Register services
    this.services.set('DBProvider', dbProvider);
    this.services.set('WarehouseServiceFactory', warehouseFactory);
    this.services.set('CostCalculatorService', costCalculator);
    this.services.set('TimeCalculatorService', timeCalculator);
    this.services.set('TransferStrategyFactory', strategyFactory);
    this.services.set('InventoryService', inventoryService);
    this.services.set('TransferService', transferService);
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
}