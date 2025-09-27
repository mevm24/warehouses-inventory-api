// === Warehouse Configuration and Location Interfaces ===

import type { NormalizedInventoryItemV2 } from './core';

/**
 * Geographic location of a warehouse
 */
export interface WarehouseLocation {
  lat: number;
  long: number;
}

/**
 * API configuration for different warehouse types
 */
export interface WarehouseApiConfig {
  type: 'internal' | 'external-b-style' | 'external-c-style';
  baseUrl?: string;
  endpoints?: {
    categories?: string;
    lookup?: string;
    inventory?: string;
    items?: string;
  };
  defaultTransferCost?: number;
  defaultTransferTime?: number;
}

/**
 * Complete warehouse configuration
 */
export interface WarehouseConfig {
  id: string;
  name: string;
  location: WarehouseLocation;
  api: WarehouseApiConfig;
}

/**
 * Common interface for warehouse adapters
 */
export interface IWarehouseAdapter {
  getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
  updateInventory(upc: string, quantityChange: number): Promise<void>;
}

/**
 * Legacy warehouse ID type (V1)
 */
export type WarehouseId = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Transfer rule type enumeration
 */
export enum TransferRuleType {
  FASTEST = 'fastest',
  CHEAPEST = 'cheapest',
}
