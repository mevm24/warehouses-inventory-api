import type { WarehouseConfig } from '../interfaces';

export class WarehouseRegistry {
  private warehouses: Map<string, WarehouseConfig> = new Map();

  constructor(configs: WarehouseConfig[]) {
    configs.forEach((config) => {
      this.warehouses.set(config.id, config);
    });
  }

  getWarehouse(id: string): WarehouseConfig | undefined {
    return this.warehouses.get(id);
  }

  getAllWarehouses(): WarehouseConfig[] {
    return Array.from(this.warehouses.values());
  }

  getWarehouseIds(): string[] {
    return Array.from(this.warehouses.keys());
  }

  hasWarehouse(id: string): boolean {
    return this.warehouses.has(id);
  }

  registerWarehouse(config: WarehouseConfig): void {
    this.warehouses.set(config.id, config);
  }

  removeWarehouse(id: string): boolean {
    return this.warehouses.delete(id);
  }
}
