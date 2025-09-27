import { ICostCalculator, ITimeCalculator } from '../interfaces/services';
import { ICostCalculatorV2, ITimeCalculatorV2 } from '../interfaces/servicesV2';
import { NormalizedInventoryItem, NormalizedInventoryItemV2 } from '../interfaces/general';
import { IWarehouseRegistryService } from './warehouseRegistryService';

export class UnifiedCostCalculatorService implements ICostCalculator, ICostCalculatorV2 {
  constructor(private warehouseRegistry?: IWarehouseRegistryService) {}

  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItem | NormalizedInventoryItemV2): number {
    const costPerMile = this.getCostPerMile(warehouse, item);
    return distance * costPerMile;
  }

  private getCostPerMile(warehouse: string, item?: NormalizedInventoryItem | NormalizedInventoryItemV2): number {
    if (this.warehouseRegistry) {
      return this.getCostPerMileV2(warehouse, item as NormalizedInventoryItemV2);
    } else {
      return this.getCostPerMileV1(warehouse, item as NormalizedInventoryItem);
    }
  }

  private getCostPerMileV1(warehouse: string, item?: NormalizedInventoryItem): number {
    const COST_RATES = {
      A: 0.2,
      B_DEFAULT: 0.7,
      C_DEFAULT: 0.65
    };

    switch (warehouse) {
      case 'A':
        return COST_RATES.A;
      case 'B':
        return item?.locationDetails?.mileageCostPerMile || COST_RATES.B_DEFAULT;
      case 'C':
        return item?.locationDetails?.transfer_fee_mile || COST_RATES.C_DEFAULT;
      default:
        return COST_RATES.A;
    }
  }

  private getCostPerMileV2(warehouse: string, item?: NormalizedInventoryItemV2): number {
    const warehouseConfig = this.warehouseRegistry!.getWarehouse(warehouse);

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

export class UnifiedTimeCalculatorService implements ITimeCalculator, ITimeCalculatorV2 {
  constructor(private warehouseRegistry?: IWarehouseRegistryService) {}

  calculateTime(warehouse: string, distance: number): number {
    if (this.warehouseRegistry) {
      return this.calculateTimeV2(warehouse, distance);
    } else {
      return this.calculateTimeV1(warehouse, distance);
    }
  }

  private calculateTimeV1(warehouse: string, distance: number): number {
    const TIME_RATES = {
      A: 0.01,
      B: 0.008,
      C: 0.012
    };

    const timePerMile = this.getTimePerMileV1(warehouse, TIME_RATES);
    return distance * timePerMile;
  }

  private getTimePerMileV1(warehouse: string, TIME_RATES: { A: number; B: number; C: number }): number {
    switch (warehouse) {
      case 'A':
        return TIME_RATES.A;
      case 'B':
        return TIME_RATES.B;
      case 'C':
        return TIME_RATES.C;
      default:
        return TIME_RATES.A;
    }
  }

  private calculateTimeV2(warehouse: string, distance: number): number {
    const warehouseConfig = this.warehouseRegistry!.getWarehouse(warehouse);

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