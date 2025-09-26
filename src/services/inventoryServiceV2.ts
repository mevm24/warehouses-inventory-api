import { IInventoryService } from '../interfaces/services';
import { NormalizedInventoryItem, NormalizedInventoryItemV2 } from '../interfaces/general';
import { IWarehouseRegistryService } from './warehouseRegistryService';
import { WarehouseAdapterFactory } from './warehouseAdapterV2';
import { DBConnector } from '../interfaces/db';

export interface IInventoryServiceV2 {
  getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
  getInventoryFromWarehouse(warehouseId: string, upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
}

export class InventoryServiceV2 implements IInventoryServiceV2 {
  private adapterFactory: WarehouseAdapterFactory;

  constructor(
    private warehouseRegistry: IWarehouseRegistryService,
    databaseConnector: DBConnector
  ) {
    this.adapterFactory = new WarehouseAdapterFactory(databaseConnector);
  }

  async getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]> {
    const warehouses = this.warehouseRegistry.getAllWarehouses();
    const inventoryPromises = warehouses.map(warehouse => {
      const adapter = this.adapterFactory.create(warehouse);
      return adapter.getInventory(upc, category);
    });

    const inventoryResults = await Promise.all(inventoryPromises);
    return inventoryResults.flat();
  }

  async getInventoryFromWarehouse(warehouseId: string, upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]> {
    const warehouse = this.warehouseRegistry.getWarehouse(warehouseId);
    if (!warehouse) {
      throw new Error(`Warehouse "${warehouseId}" not found.`);
    }

    const adapter = this.adapterFactory.create(warehouse);
    return await adapter.getInventory(upc, category);
  }
}