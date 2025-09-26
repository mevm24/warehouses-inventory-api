import { InternalInventoryItem } from "../interfaces/general";
import { DBConnector } from "../interfaces/db";

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

export const updateInternalInventory = async (upc: string, quantityChange: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const item = internalInventory.find(i => i.upc === upc);
      if (!item) {
        return reject(new Error(`Item with UPC ${upc} not found in Internal Inventory.`));
      }
      if (item.quantity + quantityChange < 0) {
        return reject(new Error(`Insufficient stock for UPC ${upc}.`));
      }
      item.quantity += quantityChange;
      resolve();
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
  async updateInternalInventory(upc: string, quantityChange: number) {
    return await updateInternalInventory(upc, quantityChange);
  }
}