import type { InternalInventoryItem } from '../interfaces';
import type { DBConnector } from '../interfaces/db';

// Internal Warehouse A (mock database)
const internalInventory: InternalInventoryItem[] = [
  { upc: '12345678', category: 'widgets', name: 'Super Widget', quantity: 15 },
  { upc: '87654321', category: 'gadgets', name: 'Ultra Gadget', quantity: 20 },
  { upc: '44445555', category: 'widgets', name: 'Mini Widget', quantity: 50 },
  { upc: '99990000', category: 'accessories', name: 'Accessory 1', quantity: 5 },
];

export const fetchInternalInventory = async (): Promise<InternalInventoryItem[]> => {
  // Simulate async DB call
  return new Promise((resolve) => {
    setTimeout(() => resolve(internalInventory), 50);
  });
};

export const updateInternalInventory = async (upc: string, quantityChange: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const item = internalInventory.find((i) => i.upc === upc);
      if (!item) {
        return reject(new Error(`Item with UPC ${upc} not found in Internal Inventory.`));
      }

      // If deducting (negative change), limit to available quantity
      // E.g., if trying to deduct -10 but only have 5, actually deduct -5
      const actualChange =
        quantityChange < 0
          ? Math.max(quantityChange, -item.quantity) // Math.max(-10, -5) = -5
          : quantityChange;

      item.quantity += actualChange;
      resolve(actualChange);
    }, 50);
  });
};

export class DBProvider implements DBConnector {
  // Define methods as needed for real DB connection
  connect() {
    return Promise.resolve();
  }
  disconnect() {
    return Promise.resolve();
  }
  async fetchInternalInventory() {
    return await fetchInternalInventory();
  }
  async updateInternalInventory(upc: string, quantityChange: number): Promise<number> {
    return await updateInternalInventory(upc, quantityChange);
  }
}
