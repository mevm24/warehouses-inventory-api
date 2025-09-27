import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import type { WarehouseBItem, WarehouseCItem } from '../interfaces';

/**
 * Set up a mock adapter for Axios to simulate external API calls.
 * This prevents the code from making actual HTTP requests.
 */
export const mockAxios = new MockAdapter(axios, { delayResponse: 500 });

// Mock data and API for Warehouse B
const warehouseBInventory: WarehouseBItem[] = [
  { sku: 'SKU1234', label: 'Super Widget', stock: 52, coords: [40.7128, -74.006], mileageCostPerMile: 0.7 },
  { sku: 'SKU5678', label: 'Ultra Gadget', stock: 30, coords: [34.0522, -118.2437], mileageCostPerMile: 0.8 },
];

// Mock data and API for Warehouse C
const warehouseCInventory: WarehouseCItem[] = [
  { upc: '12345678', desc: 'Widget - Super', qty: 25, position: { lat: 41.2, long: -73.7 }, transfer_fee_mile: 0.65 },
  { upc: '98765432', desc: 'Gadget - Smart', qty: 45, position: { lat: 34.2, long: -118.5 }, transfer_fee_mile: 0.75 },
];

// Mock data and API for Warehouse D (external-b-style)
const warehouseDInventory: WarehouseBItem[] = [
  { sku: 'SKU9999', label: 'Premium Widget', stock: 75, coords: [47.6062, -122.3321], mileageCostPerMile: 0.5 },
  { sku: 'SKU8888', label: 'Eco Gadget', stock: 42, coords: [47.6062, -122.3321], mileageCostPerMile: 0.55 },
  { sku: 'SKU7777', label: 'Smart Accessory', stock: 18, coords: [47.6062, -122.3321], mileageCostPerMile: 0.48 },
];

// Mock data and API for Warehouse E (external-c-style)
const warehouseEInventory: WarehouseCItem[] = [
  {
    upc: '11111111',
    desc: 'Widget - Advanced',
    qty: 60,
    position: { lat: 41.8781, long: -87.6298 },
    transfer_fee_mile: 0.55,
  },
  {
    upc: '22222222',
    desc: 'Gadget - Professional',
    qty: 35,
    position: { lat: 41.8781, long: -87.6298 },
    transfer_fee_mile: 0.58,
  },
  {
    upc: '33333333',
    desc: 'Accessory - Deluxe',
    qty: 28,
    position: { lat: 41.8781, long: -87.6298 },
    transfer_fee_mile: 0.52,
  },
];

// Mock locations for each warehouse
export const warehouseLocations = {
  A: { lat: 34.0522, long: -118.2437 }, // Los Angeles
  B: { lat: 40.7128, long: -74.006 }, // New York
  C: { lat: 41.2, long: -73.7 }, // Connecticut
  D: { lat: 47.6062, long: -122.3321 }, // Seattle
  E: { lat: 41.8781, long: -87.6298 }, // Chicago
};

// Mock Warehouse B API calls
mockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
mockAxios.onPost('http://b.api/lookup/87654321').reply(200, ['SKU5678']);
mockAxios.onGet('http://b.api/inventory/SKU1234').reply(200, [warehouseBInventory[0]]);
mockAxios.onGet('http://b.api/inventory/SKU5678').reply(200, [warehouseBInventory[1]]);
mockAxios.onAny(/^http:\/\/b\.api\/.*$/).passThrough();

// Mock Warehouse C API calls
mockAxios.onGet('http://c.api/api/cats').reply(200, ['Gadgets', 'Widgets', 'Accessories']);
mockAxios.onGet('http://c.api/api/items?upc=12345678').reply(200, [warehouseCInventory[0]]);
mockAxios.onGet('http://c.api/api/items?upc=98765432').reply(200, [warehouseCInventory[1]]);
mockAxios.onAny(/^http:\/\/c\.api\/.*$/).passThrough();

// Mock Warehouse D API calls (external-b-style)
mockAxios.onPost('http://d.api/lookup/11111111').reply(200, ['SKU9999']);
mockAxios.onPost('http://d.api/lookup/22222222').reply(200, ['SKU8888']);
mockAxios.onPost('http://d.api/lookup/33333333').reply(200, ['SKU7777']);
mockAxios.onGet('http://d.api/inventory/SKU9999').reply(200, [warehouseDInventory[0]]);
mockAxios.onGet('http://d.api/inventory/SKU8888').reply(200, [warehouseDInventory[1]]);
mockAxios.onGet('http://d.api/inventory/SKU7777').reply(200, [warehouseDInventory[2]]);
mockAxios.onAny(/^http:\/\/d\.api\/.*$/).passThrough();

// Mock Warehouse E API calls (external-c-style)
mockAxios.onGet('http://e.api/api/categories').reply(200, ['Gadgets', 'Widgets', 'Accessories']);
mockAxios.onGet('http://e.api/api/products?upc=11111111').reply(200, [warehouseEInventory[0]]);
mockAxios.onGet('http://e.api/api/products?upc=22222222').reply(200, [warehouseEInventory[1]]);
mockAxios.onGet('http://e.api/api/products?upc=33333333').reply(200, [warehouseEInventory[2]]);
mockAxios.onAny(/^http:\/\/e\.api\/.*$/).passThrough();
