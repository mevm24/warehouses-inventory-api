import dotenv from 'dotenv';
import { WarehouseConfig } from '../interfaces/warehouse';
dotenv.config();

// Locations for transfer cost/time calculation
export const WAREHOUSE_LOCATIONS = {
  A: { lat: 34.0522, long: -118.2437 }, // Los Angeles
  B: { lat: 40.7128, long: -74.0060 }, // New York
  C: { lat: 41.2, long: -73.7 }, // New York Area
};

export const PORT = process.env.PORT || 3000;

// Default configuration for current 3 warehouses
export const DEFAULT_WAREHOUSE_CONFIGS: WarehouseConfig[] = [
  {
    id: 'A',
    name: 'Internal Warehouse',
    location: { lat: 34.0522, long: -118.2437 }, // Los Angeles
    api: {
      type: 'internal',
      defaultTransferCost: 0.2,
      defaultTransferTime: 1
    }
  },
  {
    id: 'B',
    name: 'Warehouse B',
    location: { lat: 40.7128, long: -74.0060 }, // New York
    api: {
      type: 'external-b-style',
      baseUrl: 'http://b.api',
      endpoints: {
        lookup: '/lookup',
        inventory: '/inventory'
      },
      defaultTransferCost: 0.7,
      defaultTransferTime: 1.5
    }
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
        items: '/api/items'
      },
      defaultTransferCost: 0.65,
      defaultTransferTime: 2.5
    }
  }
];