import dotenv from 'dotenv';
import type { WarehouseConfig } from '../interfaces';

dotenv.config();

// === Server Configuration ===
export const PORT = process.env.PORT || 3000;

// === Validation Constants ===
export const VALID_CATEGORIES = ['widgets', 'gadgets', 'accessories'];
export const MIN_UPC_LENGTH = 8;
export const UPC_PATTERN = /^\d+$/;

// === Geographic Constants ===
export const EARTH_RADIUS_MILES = 3958.8;

// === Warehouse Locations ===
// Locations for transfer cost/time calculation
export const WAREHOUSE_LOCATIONS = {
  A: { lat: 34.0522, long: -118.2437 }, // Los Angeles
  B: { lat: 40.7128, long: -74.006 }, // New York
  C: { lat: 41.2, long: -73.7 }, // New York Area
};

// Default configuration for current 3 warehouses
export const DEFAULT_WAREHOUSE_CONFIGS: WarehouseConfig[] = [
  {
    id: 'A',
    name: 'Internal Warehouse',
    location: { lat: 34.0522, long: -118.2437 }, // Los Angeles
    api: {
      type: 'internal',
      defaultTransferCost: 0.2,
      defaultTransferTime: 1,
    },
  },
  {
    id: 'B',
    name: 'Warehouse B',
    location: { lat: 40.7128, long: -74.006 }, // New York
    api: {
      type: 'external-b-style',
      baseUrl: 'http://b.api',
      endpoints: {
        lookup: '/lookup',
        inventory: '/inventory',
      },
      defaultTransferCost: 0.7,
      defaultTransferTime: 1.5,
    },
  },
  {
    id: 'C',
    name: 'Warehouse C',
    location: { lat: 41.2, long: -73.7 }, // Connecticut
    api: {
      type: 'external-c-style',
      baseUrl: 'http://c.api',
      endpoints: {
        categories: '/api/cats',
        items: '/api/items',
      },
      defaultTransferCost: 0.65,
      defaultTransferTime: 2.5,
    },
  },
];
