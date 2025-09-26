import { ITransferStrategy, ICostCalculator, ITimeCalculator } from '../interfaces/services';
import { NormalizedInventoryItem } from '../interfaces/general';
import { TransferRuleType } from '../types/warehouse';

export class FastestTransferStrategy implements ITransferStrategy {
  constructor(private timeCalculator: ITimeCalculator) {}

  calculate(distance: number, item: NormalizedInventoryItem): { metric: number; label: string } {
    const metric = this.timeCalculator.calculateTime(item.source, distance);
    return {
      metric,
      label: `Time: ${metric.toFixed(2)} hours`
    };
  }
}

export class CheapestTransferStrategy implements ITransferStrategy {
  constructor(private costCalculator: ICostCalculator) {}

  calculate(distance: number, item: NormalizedInventoryItem): { metric: number; label: string } {
    const metric = this.costCalculator.calculateCost(item.source, distance, item);
    return {
      metric,
      label: `Cost: $${metric.toFixed(2)}`
    };
  }
}

export class TransferStrategyFactory {
  private strategies: Map<string, ITransferStrategy> = new Map();

  constructor(
    private costCalculator: ICostCalculator,
    private timeCalculator: ITimeCalculator
  ) {
    this.strategies.set(TransferRuleType.FASTEST, new FastestTransferStrategy(timeCalculator));
    this.strategies.set(TransferRuleType.CHEAPEST, new CheapestTransferStrategy(costCalculator));
  }

  create(ruleType: string): ITransferStrategy {
    const strategy = this.strategies.get(ruleType);
    if (strategy) {
      return strategy;
    }

    // Default to cheapest strategy for unknown rules to keep system extensible
    return new CheapestTransferStrategy(this.costCalculator);
  }

  registerStrategy(ruleType: string, strategy: ITransferStrategy): void {
    this.strategies.set(ruleType, strategy);
  }
}