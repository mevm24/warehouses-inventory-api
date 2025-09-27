import { DEFAULT_WAREHOUSE_CONFIGS } from '../constants';
import type { WarehouseConfig } from '../interfaces';
import { loadWarehousesFromEnv } from './warehouseLoader';
import { WarehouseRegistry } from './warehouseRegistry';

// Create singleton instance using dynamic configuration
let warehouseConfigs: WarehouseConfig[];
try {
  warehouseConfigs = loadWarehousesFromEnv();
  console.log(`✅ Loaded ${warehouseConfigs.length} warehouses from configuration file`);
} catch (error) {
  console.warn('❌ Failed to load warehouse config file, using defaults:', error);
  warehouseConfigs = DEFAULT_WAREHOUSE_CONFIGS;
  console.log(`✅ Using ${warehouseConfigs.length} default warehouses`);
}

console.log('Creating warehouse registry...');
export const warehouseRegistry = new WarehouseRegistry(warehouseConfigs);
console.log('✅ Warehouse registry created successfully');
