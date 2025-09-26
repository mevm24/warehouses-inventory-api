import { warehouseRegistry } from '../config/registry';
import { WarehouseConfig } from '../interfaces/warehouse';

export interface IWarehouseRegistryService {
  getAllWarehouses(): WarehouseConfig[];
  hasWarehouse(warehouseId: string): boolean;
  registerWarehouse(warehouse: WarehouseConfig): void;
  unregisterWarehouse(warehouseId: string): boolean;
  getWarehouse(warehouseId: string): WarehouseConfig | undefined;
}

export class WarehouseRegistryService implements IWarehouseRegistryService {
  getAllWarehouses(): WarehouseConfig[] {
    return warehouseRegistry.getAllWarehouses();
  }

  hasWarehouse(warehouseId: string): boolean {
    return warehouseRegistry.hasWarehouse(warehouseId);
  }

  registerWarehouse(warehouse: WarehouseConfig): void {
    warehouseRegistry.registerWarehouse(warehouse);
  }

  getWarehouse(warehouseId: string): WarehouseConfig | undefined {
    return warehouseRegistry.getWarehouse(warehouseId);
  }

  unregisterWarehouse(warehouseId: string): boolean {
    return warehouseRegistry.removeWarehouse(warehouseId);
  }
}