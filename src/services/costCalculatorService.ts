import { ICostCalculator } from '../interfaces/services';
import { NormalizedInventoryItem } from '../interfaces/general';

export class CostCalculatorService implements ICostCalculator {
  private readonly COST_RATES = {
    A: 0.2,
    B_DEFAULT: 0.7,
    C_DEFAULT: 0.65
  };

  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItem): number {
    const costPerMile = this.getCostPerMile(warehouse, item);
    return distance * costPerMile;
  }

  private getCostPerMile(warehouse: string, item?: NormalizedInventoryItem): number {
    switch (warehouse) {
      case 'A':
        return this.COST_RATES.A;
      case 'B':
        return item?.locationDetails?.mileageCostPerMile || this.COST_RATES.B_DEFAULT;
      case 'C':
        return item?.locationDetails?.transfer_fee_mile || this.COST_RATES.C_DEFAULT;
      default:
        return this.COST_RATES.A;
    }
  }
}