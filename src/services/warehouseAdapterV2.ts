import axios from 'axios';
import { IWarehouseAdapter, WarehouseConfig, WarehouseApiConfig } from '../interfaces/warehouse';
import { NormalizedInventoryItemV2, WarehouseBItem, WarehouseCItem } from '../interfaces/general';
import { DBConnector } from '../interfaces/db';
import { CategoryClassifier } from '../utils/category';

export class InternalWarehouseAdapter implements IWarehouseAdapter {
  constructor(
    private warehouseConfig: WarehouseConfig,
    private databaseConnector: DBConnector
  ) {}

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]> {
    let items = await this.databaseConnector.fetchInternalInventory();

    if (upc) {
      items = items.filter(item => item.upc === upc);
    }
    if (category) {
      items = items.filter(item => item.category === category);
    }

    return items.map(item => ({
      source: this.warehouseConfig.id,
      upc: item.upc,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      locationDetails: { coords: [this.warehouseConfig.location.lat, this.warehouseConfig.location.long] },
      transferCost: this.warehouseConfig.api.defaultTransferCost || 0.2,
      transferTime: this.warehouseConfig.api.defaultTransferTime || 1,
    }));
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    await this.databaseConnector.updateInternalInventory(upc, quantityChange);
  }
}

export class ExternalBStyleWarehouseAdapter implements IWarehouseAdapter {
  constructor(private warehouseConfig: WarehouseConfig) {}

  async getInventory(upc?: string): Promise<NormalizedInventoryItemV2[]> {
    if (!upc || !this.warehouseConfig.api.baseUrl) return [];

    try {
      const lookupUrl = `${this.warehouseConfig.api.baseUrl}${this.warehouseConfig.api.endpoints?.lookup}/${upc}`;
      const lookupResponse = await axios.post(lookupUrl);
      const skus: string[] = lookupResponse.data;
      const items: NormalizedInventoryItemV2[] = [];

      for (const sku of skus) {
        const inventoryUrl = `${this.warehouseConfig.api.baseUrl}${this.warehouseConfig.api.endpoints?.inventory}/${sku}`;
        const inventoryResponse = await axios.get(inventoryUrl);

        for (const bItem of inventoryResponse.data as WarehouseBItem[]) {
          const category = CategoryClassifier.getCategoryFromLabel(bItem.label);
          items.push({
            source: this.warehouseConfig.id,
            upc: bItem.sku,
            category,
            name: bItem.label,
            quantity: bItem.stock,
            locationDetails: { coords: bItem.coords },
            transferCost: bItem.mileageCostPerMile,
            transferTime: this.warehouseConfig.api.defaultTransferTime || 2,
          });
        }
      }

      return items;
    } catch (error) {
      console.warn(`Failed to fetch inventory from warehouse ${this.warehouseConfig.id} for UPC ${upc}:`,
        error instanceof Error ? error.message : error);
      return [];
    }
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    console.log(`External API call would be made to update warehouse ${this.warehouseConfig.id} inventory for UPC ${upc}, changing by ${quantityChange} units`);
  }
}

export class ExternalCStyleWarehouseAdapter implements IWarehouseAdapter {
  constructor(private warehouseConfig: WarehouseConfig) {}

  async getInventory(upc?: string): Promise<NormalizedInventoryItemV2[]> {
    if (!upc || !this.warehouseConfig.api.baseUrl) return [];

    try {
      const itemsEndpoint = this.warehouseConfig.api.endpoints?.items || '/api/items';
      const itemsUrl = `${this.warehouseConfig.api.baseUrl}${itemsEndpoint}?upc=${upc}`;
      const itemsResponse = await axios.get(itemsUrl);

      return itemsResponse.data.map((cItem: WarehouseCItem) => {
        const category = CategoryClassifier.getCategoryFromLabel(cItem.desc);
        return {
          source: this.warehouseConfig.id,
          upc: cItem.upc,
          category,
          name: cItem.desc,
          quantity: cItem.qty,
          locationDetails: { position: cItem.position },
          transferCost: cItem.transfer_fee_mile,
          transferTime: this.warehouseConfig.api.defaultTransferTime || 3,
        };
      });
    } catch (error) {
      console.warn(`Failed to fetch inventory from warehouse ${this.warehouseConfig.id} for UPC ${upc}:`,
        error instanceof Error ? error.message : error);
      return [];
    }
  }

  async updateInventory(upc: string, quantityChange: number): Promise<void> {
    console.log(`External API call would be made to update warehouse ${this.warehouseConfig.id} inventory for UPC ${upc}, changing by ${quantityChange} units`);
  }
}

export class WarehouseAdapterFactory {
  constructor(private databaseConnector: DBConnector) {}

  create(warehouseConfig: WarehouseConfig): IWarehouseAdapter {
    switch (warehouseConfig.api.type) {
      case 'internal':
        return new InternalWarehouseAdapter(warehouseConfig, this.databaseConnector);
      case 'external-b-style':
        return new ExternalBStyleWarehouseAdapter(warehouseConfig);
      case 'external-c-style':
        return new ExternalCStyleWarehouseAdapter(warehouseConfig);
      default:
        throw new Error(`Unknown warehouse API type: ${warehouseConfig.api.type}`);
    }
  }
}