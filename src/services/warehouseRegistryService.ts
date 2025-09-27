import { warehouseRegistry } from '../config/registry';
import type { IWarehouseRegistryService, WarehouseConfig } from '../interfaces';

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
