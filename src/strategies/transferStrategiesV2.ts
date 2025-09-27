import type {
  ICostCalculatorV2,
  ITimeCalculatorV2,
  ITransferStrategyV2,
  NormalizedInventoryItemV2,
} from '../interfaces';

export class FastestTransferStrategyV2 implements ITransferStrategyV2 {
  constructor(private timeCalculator: ITimeCalculatorV2) {}

  calculate(distance: number, item: NormalizedInventoryItemV2): { metric: number; label: string } {
    const metric = this.timeCalculator.calculateTime(item.source, distance);
    return {
      metric,
      label: `Time: ${metric.toFixed(2)} hours`,
    };
  }
}

export class CheapestTransferStrategyV2 implements ITransferStrategyV2 {
  constructor(private costCalculator: ICostCalculatorV2) {}

  calculate(distance: number, item: NormalizedInventoryItemV2): { metric: number; label: string } {
    const metric = this.costCalculator.calculateCost(item.source, distance, item);
    return {
      metric,
      label: `Cost: $${metric.toFixed(2)}`,
    };
  }
}

export class TransferStrategyFactoryV2 {
  private strategies: Map<string, ITransferStrategyV2> = new Map();

  constructor(
    private costCalculator: ICostCalculatorV2,
    timeCalculator: ITimeCalculatorV2
  ) {
    this.strategies.set('cheapest', new CheapestTransferStrategyV2(costCalculator));
    this.strategies.set('fastest', new FastestTransferStrategyV2(timeCalculator));
  }

  create(ruleType: string): ITransferStrategyV2 {
    const normalizedRuleType = ruleType.toLowerCase();
    const strategy = this.strategies.get(normalizedRuleType);
    if (strategy) {
      return strategy;
    }
    // Default to cheapest if unknown rule type
    return new CheapestTransferStrategyV2(this.costCalculator);
  }
}
