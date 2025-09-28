import type { InternalInventoryItem } from './core';

export interface DBConnector {
  // Define methods as needed for real DB connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  fetchInternalInventory(): Promise<InternalInventoryItem[]>;
  updateInternalInventory(upc: string, quantityChange: number): Promise<number>; // Returns actual quantity changed
}
