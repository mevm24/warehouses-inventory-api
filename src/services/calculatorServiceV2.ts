import { ICostCalculatorV2, ITimeCalculatorV2 } from '../interfaces/servicesV2';
import { NormalizedInventoryItemV2 } from '../interfaces/general';
import { IWarehouseRegistryService } from './warehouseRegistryService';

export class CostCalculatorServiceV2 implements ICostCalculatorV2 {
  constructor(private warehouseRegistry: IWarehouseRegistryService) {}

  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItemV2): number {
    const costPerMile = this.getCostPerMile(warehouse, item);
    return distance * costPerMile;
  }

  private getCostPerMile(warehouse: string, item?: NormalizedInventoryItemV2): number {
    const warehouseConfig = this.warehouseRegistry.getWarehouse(warehouse);

    if (!warehouseConfig) {
      return 0.5; // Default cost per mile for unknown warehouses
    }

    // Use item-specific cost if available (from external APIs)
    if (item?.transferCost) {
      return item.transferCost;
    }

    // Use warehouse default cost
    if (warehouseConfig.api.defaultTransferCost) {
      return warehouseConfig.api.defaultTransferCost;
    }

    // Fallback based on warehouse type
    switch (warehouseConfig.api.type) {
      case 'internal':
        return 0.2;
      case 'external-b-style':
        return 0.7;
      case 'external-c-style':
        return 0.65;
      default:
        return 0.5;
    }
  }
}

export class TimeCalculatorServiceV2 implements ITimeCalculatorV2 {
  constructor(private warehouseRegistry: IWarehouseRegistryService) {}

  calculateTime(warehouse: string, distance: number): number {
    const warehouseConfig = this.warehouseRegistry.getWarehouse(warehouse);

    if (!warehouseConfig) {
      return distance / 30; // Default: 30 mph for unknown warehouses
    }

    // Use warehouse default time
    if (warehouseConfig.api.defaultTransferTime) {
      const baseTime = warehouseConfig.api.defaultTransferTime;
      return baseTime + (distance / 30); // Base time + travel time at 30 mph
    }

    // Fallback based on warehouse type
    switch (warehouseConfig.api.type) {
      case 'internal':
        return distance / 60; // 60 mph (fast internal processing)
      case 'external-b-style':
        return 1 + (distance / 30); // 1 hour processing + 30 mph travel
      case 'external-c-style':
        return 2 + (distance / 25); // 2 hours processing + 25 mph travel
      default:
        return distance / 30; // Default 30 mph
    }
  }
}