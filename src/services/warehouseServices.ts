import axios from 'axios';
import { WAREHOUSE_LOCATIONS } from '../constants';
import type { IWarehouseService, NormalizedInventoryItem, WarehouseBItem, WarehouseCItem } from '../interfaces';
import type { DBConnector } from '../interfaces/db';
import { getCategoryFromLabel } from '../utils/category';

export class WarehouseAService implements IWarehouseService {
  constructor(private databaseConnector: DBConnector) {}

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    let items = await this.databaseConnector.fetchInternalInventory();

    if (upc) {
      items = items.filter((item) => item.upc === upc);
    }
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    return items.map((item) => ({
      source: 'A',
      upc: item.upc,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      locationDetails: { coords: [WAREHOUSE_LOCATIONS.A.lat, WAREHOUSE_LOCATIONS.A.long] },
      transferCost: 0.2,
      transferTime: 1,
    }));
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    await this.databaseConnector.updateInternalInventory(upc, quantityChange);
  }
}

export class WarehouseBService implements IWarehouseService {
  async getInventory(upc?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const lookupResponse = await axios.post(`http://b.api/lookup/${upc}`);
      const skus: string[] = lookupResponse.data;
      const items: NormalizedInventoryItem[] = [];

      for (const sku of skus) {
        const inventoryResponse = await axios.get(`http://b.api/inventory/${sku}`);
        for (const bItem of inventoryResponse.data as WarehouseBItem[]) {
          const category = getCategoryFromLabel(bItem.label);
          items.push({
            source: 'B',
            upc: upc,
            category: category,
            name: bItem.label,
            quantity: bItem.stock,
            locationDetails: {
              sku: bItem.sku,
              coords: bItem.coords,
              mileageCostPerMile: bItem.mileageCostPerMile,
            },
            transferCost: bItem.mileageCostPerMile,
            transferTime: 1.5,
          });
        }
      }
      return items;
    } catch (error) {
      console.warn(
        `Failed to fetch inventory from warehouse B for UPC ${upc}:`,
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    console.log(
      `External API call would be made to update warehouse B inventory for UPC ${upc}, reducing by ${quantityChange} units`
    );
  }
}

export class WarehouseCService implements IWarehouseService {
  async getInventory(upc?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const response = await axios.get(`http://c.api/api/items?upc=${upc}`);
      const cItems: WarehouseCItem[] = response.data;

      return cItems.map((item) => ({
        source: 'C',
        upc: item.upc,
        category: getCategoryFromLabel(item.desc),
        name: item.desc,
        quantity: item.qty,
        locationDetails: {
          position: item.position,
          transfer_fee_mile: item.transfer_fee_mile,
        },
        transferCost: item.transfer_fee_mile,
        transferTime: 2.5,
      }));
    } catch (error) {
      console.warn(
        `Failed to fetch inventory from warehouse C for UPC ${upc}:`,
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    console.log(
      `External API call would be made to update warehouse C inventory for UPC ${upc}, reducing by ${quantityChange} units`
    );
  }
}

export class WarehouseServiceFactory {
  constructor(private databaseConnector: DBConnector) {}

  create(warehouseId: string): IWarehouseService {
    switch (warehouseId) {
      case 'A':
        return new WarehouseAService(this.databaseConnector);
      case 'B':
        return new WarehouseBService();
      case 'C':
        return new WarehouseCService();
      default:
        throw new Error(`Unknown warehouse: ${warehouseId}`);
    }
  }
}
