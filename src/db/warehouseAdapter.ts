import axios from 'axios';
import { NormalizedInventoryItemV2 as NormalizedInventoryItem, WarehouseBItem, WarehouseCItem } from '../interfaces/general';
import { DBConnector } from '../interfaces/db';
import { IWarehouseAdapter, WarehouseConfig } from '../interfaces/warehouse';
import { CategoryClassifier } from '../utils/category';

// Adapter for internal warehouse (Type A)
export class InternalWarehouseAdapter implements IWarehouseAdapter {
  constructor(
    private config: WarehouseConfig,
    private dbConnector: DBConnector
  ) { }

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    let items = await this.dbConnector.fetchInternalInventory();

    if (upc) {
      items = items.filter(item => item.upc === upc);
    }
    if (category) {
      items = items.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    return items.map(item => ({
      source: this.config.id,
      upc: item.upc,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      locationDetails: {
        coords: [this.config.location.lat, this.config.location.long]
      },
      transferCost: this.config.api.defaultTransferCost || 0.2,
      transferTime: this.config.api.defaultTransferTime || 1,
    }));
  }
}

// Adapter for B-style warehouses
export class BStyleWarehouseAdapter implements IWarehouseAdapter {
  constructor(private config: WarehouseConfig) { }

  private async getCategoryFromUPC(productLabel: string): Promise<string> {
    return CategoryClassifier.getCategoryFromLabel(productLabel);
  }

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const baseUrl = this.config.api.baseUrl;
      const lookupEndpoint = this.config.api.endpoints?.lookup || '/lookup';
      const inventoryEndpoint = this.config.api.endpoints?.inventory || '/inventory';

      const lookupResponse = await axios.post(`${baseUrl}${lookupEndpoint}/${upc}`);
      const skus: string[] = lookupResponse.data;
      const items: NormalizedInventoryItem[] = [];

      for (const sku of skus) {
        const inventoryResponse = await axios.get(`${baseUrl}${inventoryEndpoint}/${sku}`);
        for (const bItem of inventoryResponse.data as WarehouseBItem[]) {
          const itemCategory = await this.getCategoryFromUPC(bItem.label);

          if (category && itemCategory !== category) continue;

          items.push({
            source: this.config.id,
            upc: upc,
            category: itemCategory,
            name: bItem.label,
            quantity: bItem.stock,
            locationDetails: {
              sku: bItem.sku,
              coords: bItem.coords,
              mileageCostPerMile: bItem.mileageCostPerMile
            },
            transferCost: bItem.mileageCostPerMile,
            transferTime: this.config.api.defaultTransferTime || 1.5,
          });
        }
      }
      return items;
    } catch (error) {
      console.warn(`Failed to fetch inventory from warehouse ${this.config.id} for UPC ${upc}:`, error instanceof Error ? error.message : error);
      return []; // Return empty array to allow other warehouses to work
    }
  }
}

// Adapter for C-style warehouses
export class CStyleWarehouseAdapter implements IWarehouseAdapter {
  constructor(private config: WarehouseConfig) { }

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const baseUrl = this.config.api.baseUrl;
      const itemsEndpoint = this.config.api.endpoints?.items || '/api/items';

      const response = await axios.get(`${baseUrl}${itemsEndpoint}?upc=${upc}`);
      const cItems: WarehouseCItem[] = response.data;

      return cItems
        .map(item => {
          const itemCategory = CategoryClassifier.getCategoryFromLabel(item.desc);

          if (category && itemCategory !== category) return null;

          return {
            source: this.config.id,
            upc: item.upc,
            category: itemCategory,
            name: item.desc,
            quantity: item.qty,
            locationDetails: {
              position: item.position,
              transfer_fee_mile: item.transfer_fee_mile
            },
            transferCost: item.transfer_fee_mile,
            transferTime: this.config.api.defaultTransferTime || 2.5,
          };
        })
        .filter(item => item !== null) as NormalizedInventoryItem[];
    } catch (error) {
      console.warn(`Failed to fetch inventory from warehouse ${this.config.id} for UPC ${upc}:`, error instanceof Error ? error.message : error);
      return []; // Return empty array to allow other warehouses to work
    }
  }
}

// Factory to create appropriate adapter based on warehouse type
export class WarehouseAdapterFactory {
  static create(config: WarehouseConfig, dbConnector?: DBConnector): IWarehouseAdapter {
    switch (config.api.type) {
      case 'internal':
        if (!dbConnector) {
          throw new Error('Database connector required for internal warehouse');
        }
        return new InternalWarehouseAdapter(config, dbConnector);
      case 'external-b-style':
        return new BStyleWarehouseAdapter(config);
      case 'external-c-style':
        return new CStyleWarehouseAdapter(config);
      default:
        throw new Error(`Unknown warehouse type: ${config.api.type}`);
    }
  }
}