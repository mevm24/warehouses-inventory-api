import { NormalizedInventoryItem } from '../interfaces/general';
import { IInventoryService } from '../interfaces/services';
import { ValidationError, NotFoundError } from '../errors/customErrors';

export interface IQueryService {
  getInventoryByQuery(query: string): Promise<NormalizedInventoryItem[]>;
}

export class QueryService implements IQueryService {
  private readonly validCategories = ['widgets', 'gadgets', 'accessories'];

  constructor(private inventoryService: IInventoryService) {}

  async getInventoryByQuery(query: string): Promise<NormalizedInventoryItem[]> {
    const isUPC = /^\d{8,}$/.test(query);

    if (isUPC) {
      return await this.getInventoryByUPC(query);
    } else {
      return await this.getInventoryByCategory(query);
    }
  }

  private async getInventoryByUPC(upc: string): Promise<NormalizedInventoryItem[]> {
    if (upc.length < 8) {
      throw new ValidationError('Invalid UPC code.');
    }

    const items = await this.inventoryService.getAllInventory(upc);
    if (items.length === 0) {
      throw new NotFoundError(`No inventory found for UPC "${upc}".`);
    }

    return items;
  }

  private async getInventoryByCategory(category: string): Promise<NormalizedInventoryItem[]> {
    const normalizedCategory = category.toLowerCase();

    if (!this.validCategories.includes(normalizedCategory)) {
      throw new NotFoundError('Invalid category.');
    }

    const items = await this.inventoryService.getAllInventory(undefined, normalizedCategory);
    if (items.length === 0) {
      throw new NotFoundError(`No items found in category "${normalizedCategory}".`);
    }

    return items;
  }
}