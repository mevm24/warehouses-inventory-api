// === Core Data Models ===

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
 * Location details that vary by warehouse type
 */
export interface LocationDetails {
  coords?: [number, number]; // Used by warehouses A and B
  sku?: string; // Used by warehouse B
  mileageCostPerMile?: number; // Used by warehouse B
  position?: { lat: number; long: number }; // Used by warehouse C
  transfer_fee_mile?: number; // Used by warehouse C
  [key: string]: unknown; // Allow additional properties for flexibility
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
  locationDetails: LocationDetails;
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
  locationDetails: LocationDetails;
  transferCost: number;
  transferTime: number;
}

/**
 * A type definition for a transfer rule function.
 * This makes the `transferRules` object type-safe.
 */
export type TransferRule = (item: NormalizedInventoryItem) => number;

/**
 * V2 version for N warehouses
 */
export type TransferRuleV2 = (item: NormalizedInventoryItemV2) => number;

/**
 * Query validation result
 */
export interface QueryValidationResult {
  type: 'upc' | 'category';
  value: string;
}
