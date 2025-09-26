import { NormalizedInventoryItemV2 } from '../interfaces/general';
import { IInventoryServiceV2 } from './inventoryServiceV2';
import { IWarehouseRegistryService } from './warehouseRegistryService';
import { ValidationError, NotFoundError } from '../errors/customErrors';

export interface IQueryServiceV2 {
  getInventoryByQuery(query: string): Promise<NormalizedInventoryItemV2[]>;
  getInventoryFromWarehouseByQuery(warehouseId: string, query: string): Promise<NormalizedInventoryItemV2[]>;
}

export class QueryServiceV2 implements IQueryServiceV2 {
  private readonly validCategories = ['widgets', 'gadgets', 'accessories'];

  constructor(
    private inventoryServiceV2: IInventoryServiceV2,
    private warehouseRegistryService: IWarehouseRegistryService
  ) {}

  async getInventoryByQuery(query: string): Promise<NormalizedInventoryItemV2[]> {
    const isUPC = /^\d{8,}$/.test(query);

    if (isUPC) {
      return await this.getInventoryByUPC(query);
    } else {
      return await this.getInventoryByCategory(query);
    }
  }

  async getInventoryFromWarehouseByQuery(warehouseId: string, query: string): Promise<NormalizedInventoryItemV2[]> {
    // Validate warehouse exists
    if (!this.warehouseRegistryService.hasWarehouse(warehouseId)) {
      throw new NotFoundError(`Warehouse "${warehouseId}" not found.`);
    }

    const isUPC = /^\d{8,}$/.test(query);

    if (isUPC) {
      // It's a UPC
      if (query.length < 8) {
        throw new ValidationError('Invalid UPC code.');
      }
      const items = await this.inventoryServiceV2.getInventoryFromWarehouse(warehouseId, query);

      if (items.length === 0) {
        throw new NotFoundError(`No inventory found for UPC "${query}" in warehouse ${warehouseId}.`);
      }

      return items;
    } else {
      // It's a category
      const category = query.toLowerCase();
      if (!this.validCategories.includes(category)) {
        throw new NotFoundError('Invalid category.');
      }

      const items = await this.inventoryServiceV2.getInventoryFromWarehouse(warehouseId, undefined, category);

      if (items.length === 0) {
        throw new NotFoundError(`No items found in category "${category}" for warehouse ${warehouseId}.`);
      }

      return items;
    }
  }

  private async getInventoryByUPC(upc: string): Promise<NormalizedInventoryItemV2[]> {
    if (upc.length < 8) {
      throw new ValidationError('Invalid UPC code.');
    }

    const items = await this.inventoryServiceV2.getAllInventory(upc);
    if (items.length === 0) {
      throw new NotFoundError(`No inventory found for UPC "${upc}".`);
    }

    return items;
  }

  private async getInventoryByCategory(category: string): Promise<NormalizedInventoryItemV2[]> {
    const normalizedCategory = category.toLowerCase();

    if (!this.validCategories.includes(normalizedCategory)) {
      throw new NotFoundError('Invalid category.');
    }

    const items = await this.inventoryServiceV2.getAllInventory(undefined, normalizedCategory);
    if (items.length === 0) {
      throw new NotFoundError(`No items found in category "${normalizedCategory}".`);
    }

    return items;
  }
}