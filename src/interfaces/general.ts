// --- Type Definitions for the Inventory API ---

/**
 * Represents an inventory item in the internal (A) warehouse.
 */
export interface InternalInventoryItem {
  upc: string;
  category: string;
  name: string;
  quantity: number;
}

/**
 * Represents an inventory item returned from Warehouse B's API.
 */
export interface WarehouseBItem {
  sku: string;
  label: string;
  stock: number;
  coords: [number, number];
  mileageCostPerMile: number;
}

/**
 * Represents an inventory item returned from Warehouse C's API.
 */
export interface WarehouseCItem {
  upc: string;
  desc: string;
  qty: number;
  position: { lat: number; long: number };
  transfer_fee_mile: number;
}

/**
 * Represents a single normalized inventory item from any warehouse.
 * This is the common data structure used across the application.
 */
export interface NormalizedInventoryItem {
  source: 'A' | 'B' | 'C'; // Warehouse ID (V1 compatible)
  upc: string;
  category: string;
  name: string;
  quantity: number;
  locationDetails: any;
  transferCost: number;
  transferTime: number;
}

/**
 * V2 version with support for N warehouses
 */
export interface NormalizedInventoryItemV2 {
  source: string; // Warehouse ID (supports any warehouse: A, B, C, D, E, etc.)
  upc: string;
  category: string;
  name: string;
  quantity: number;
  locationDetails: any;
  transferCost: number;
  transferTime: number;
}

/**
 * Represents the structure of an inventory transfer request.
 */
export interface TransferRequest {
  from: 'A' | 'B' | 'C' | undefined; // Warehouse ID (V1 compatible)
  to: 'A' | 'B' | 'C' | undefined; // Warehouse ID (V1 compatible)
  UPC: string;
  quantity: number;
  rule: 'fastest' | 'cheapest';
}

/**
 * V2 version with support for N warehouses
 */
export interface TransferRequestV2 {
  from: string | undefined; // Warehouse ID (supports any warehouse)
  to: string | undefined; // Warehouse ID (supports any warehouse)
  UPC: string;
  quantity: number;
  rule: 'fastest' | 'cheapest';
}

/**
 * A type definition for a transfer rule function.
 * This makes the `transferRules` object type-safe.
 */
export interface TransferRule {
  (item: NormalizedInventoryItem): number;
}

/**
 * V2 version for N warehouses
 */
export interface TransferRuleV2 {
  (item: NormalizedInventoryItemV2): number;
}
