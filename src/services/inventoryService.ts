import { IInventoryService } from '../interfaces/services';
import { NormalizedInventoryItem } from '../interfaces/general';
import { WarehouseServiceFactory } from './warehouseServices';

export class InventoryService implements IInventoryService {
  constructor(private warehouseFactory: WarehouseServiceFactory) {}

  async getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    const warehouses = ['A', 'B', 'C'];
    const inventoryPromises = warehouses.map(warehouseId => {
      const warehouseService = this.warehouseFactory.create(warehouseId);
      return warehouseService.getInventory(upc, category);
    });

    const inventoryResults = await Promise.all(inventoryPromises);
    return inventoryResults.flat();
  }
}