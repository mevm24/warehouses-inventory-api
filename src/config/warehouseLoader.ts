import fs from 'node:fs';
import path from 'node:path';
import type { WarehouseConfig } from '../interfaces';
import { WarehouseRegistry } from './warehouseRegistry';

/**
 * Load warehouse configurations from a JSON file
 */
export function loadWarehousesFromFile(filePath: string): WarehouseConfig[] {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const config = JSON.parse(fileContent);

    if (!config.warehouses || !Array.isArray(config.warehouses)) {
      throw new Error('Invalid configuration file: missing "warehouses" array');
    }

    return config.warehouses;
  } catch (error) {
    console.error(`Failed to load warehouse configuration from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Load warehouse configurations from environment variable
 */
export function loadWarehousesFromEnv(): WarehouseConfig[] {
  const configPath = process.env.WAREHOUSE_CONFIG_PATH || './src/config/warehouses.json';
  return loadWarehousesFromFile(configPath);
}

/**
 * Create a WarehouseRegistry with configurations loaded from file
 */
export function createWarehouseRegistry(configPath?: string): WarehouseRegistry {
  const configs = configPath ? loadWarehousesFromFile(configPath) : loadWarehousesFromEnv();

  return new WarehouseRegistry(configs);
}

/**
 * Save warehouse configurations to a JSON file
 */
export function saveWarehousesToFile(warehouses: WarehouseConfig[], filePath: string): void {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    const config = {
      warehouses,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(absolutePath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`Warehouse configuration saved to ${absolutePath}`);
  } catch (error) {
    console.error(`Failed to save warehouse configuration to ${filePath}:`, error);
    throw error;
  }
}
