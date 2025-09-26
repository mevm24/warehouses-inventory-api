import {
  FastestTransferStrategy,
  CheapestTransferStrategy,
  TransferStrategyFactory
} from '../../../src/strategies/transferStrategies';
import { CostCalculatorService } from '../../../src/services/costCalculatorService';
import { TimeCalculatorService } from '../../../src/services/timeCalculatorService';
import { NormalizedInventoryItem } from '../../../src/interfaces/general';
import { TransferRuleType } from '../../../src/types/warehouse';

describe('Transfer Strategies (New Architecture)', () => {
  let costCalculator: CostCalculatorService;
  let timeCalculator: TimeCalculatorService;
  let strategyFactory: TransferStrategyFactory;

  const mockItem: NormalizedInventoryItem = {
    source: 'A',
    upc: '12345678',
    category: 'widgets',
    name: 'Test Widget',
    quantity: 10,
    locationDetails: {},
    transferCost: 5.0,
    transferTime: 2.5
  };

  beforeEach(() => {
    costCalculator = new CostCalculatorService();
    timeCalculator = new TimeCalculatorService();
    strategyFactory = new TransferStrategyFactory(costCalculator, timeCalculator);
  });

  describe('FastestTransferStrategy', () => {
    let strategy: FastestTransferStrategy;

    beforeEach(() => {
      strategy = new FastestTransferStrategy(timeCalculator);
    });

    it('should calculate time-based metric correctly', () => {
      const distance = 100;
      const result = strategy.calculate(distance, mockItem);

      expect(result.metric).toBe(1); // 100 * 0.01 (warehouse A time rate)
      expect(result.label).toBe('Time: 1.00 hours');
    });

    it('should handle different warehouses', () => {
      const itemB = { ...mockItem, source: 'B' as const };
      const distance = 100;
      const result = strategy.calculate(distance, itemB);

      expect(result.metric).toBe(0.8); // 100 * 0.008 (warehouse B time rate)
      expect(result.label).toBe('Time: 0.80 hours');
    });

    it('should format label correctly with decimals', () => {
      const distance = 123.45;
      const result = strategy.calculate(distance, mockItem);

      expect(result.label).toMatch(/Time: \d+\.\d{2} hours/);
    });
  });

  describe('CheapestTransferStrategy', () => {
    let strategy: CheapestTransferStrategy;

    beforeEach(() => {
      strategy = new CheapestTransferStrategy(costCalculator);
    });

    it('should calculate cost-based metric correctly', () => {
      const distance = 100;
      const result = strategy.calculate(distance, mockItem);

      expect(result.metric).toBe(20); // 100 * 0.2 (warehouse A cost rate)
      expect(result.label).toBe('Cost: $20.00');
    });

    it('should handle different warehouses', () => {
      const itemC = { ...mockItem, source: 'C' as const };
      const distance = 100;
      const result = strategy.calculate(distance, itemC);

      expect(result.metric).toBe(65); // 100 * 0.65 (warehouse C default cost rate)
      expect(result.label).toBe('Cost: $65.00');
    });

    it('should format currency correctly', () => {
      const distance = 123.456;
      const result = strategy.calculate(distance, mockItem);

      expect(result.label).toMatch(/Cost: \$\d+\.\d{2}/);
    });

    it('should use item-specific rates when available', () => {
      const itemWithCustomRate = {
        ...mockItem,
        source: 'B' as const,
        locationDetails: { mileageCostPerMile: 1.5 }
      };
      const distance = 100;
      const result = strategy.calculate(distance, itemWithCustomRate);

      expect(result.metric).toBe(150); // 100 * 1.5 (item-specific rate)
    });
  });

  describe('TransferStrategyFactory', () => {
    it('should create fastest strategy', () => {
      const strategy = strategyFactory.create(TransferRuleType.FASTEST);

      expect(strategy).toBeInstanceOf(FastestTransferStrategy);
    });

    it('should create cheapest strategy', () => {
      const strategy = strategyFactory.create(TransferRuleType.CHEAPEST);

      expect(strategy).toBeInstanceOf(CheapestTransferStrategy);
    });

    it('should default to cheapest strategy for unknown rules', () => {
      const strategy = strategyFactory.create('unknown-rule');

      expect(strategy).toBeInstanceOf(CheapestTransferStrategy);
    });

    it('should allow registering custom strategies', () => {
      const customStrategy = {
        calculate: jest.fn().mockReturnValue({ metric: 42, label: 'Custom: 42' })
      };

      strategyFactory.registerStrategy('custom', customStrategy);
      const strategy = strategyFactory.create('custom');

      expect(strategy).toBe(customStrategy);
    });

    it('should maintain registered strategies', () => {
      const customStrategy = {
        calculate: jest.fn().mockReturnValue({ metric: 100, label: 'Custom: 100' })
      };

      strategyFactory.registerStrategy('priority', customStrategy);

      // Should return the same strategy instance
      const strategy1 = strategyFactory.create('priority');
      const strategy2 = strategyFactory.create('priority');

      expect(strategy1).toBe(strategy2);
      expect(strategy1).toBe(customStrategy);
    });

    it('should override existing strategies when re-registering', () => {
      const strategy1 = {
        calculate: jest.fn().mockReturnValue({ metric: 1, label: 'First' })
      };
      const strategy2 = {
        calculate: jest.fn().mockReturnValue({ metric: 2, label: 'Second' })
      };

      strategyFactory.registerStrategy('test', strategy1);
      strategyFactory.registerStrategy('test', strategy2);

      const retrievedStrategy = strategyFactory.create('test');

      expect(retrievedStrategy).toBe(strategy2);
      expect(retrievedStrategy).not.toBe(strategy1);
    });
  });

  describe('integration tests', () => {
    it('should work with both strategies using same factory', () => {
      const distance = 200;

      const fastestStrategy = strategyFactory.create(TransferRuleType.FASTEST);
      const cheapestStrategy = strategyFactory.create(TransferRuleType.CHEAPEST);

      const fastestResult = fastestStrategy.calculate(distance, mockItem);
      const cheapestResult = cheapestStrategy.calculate(distance, mockItem);

      expect(fastestResult.label).toContain('Time:');
      expect(cheapestResult.label).toContain('Cost:');
      expect(fastestResult.metric).not.toBe(cheapestResult.metric);
    });

    it('should handle edge cases gracefully', () => {
      const zeroDistance = 0;
      const strategy = strategyFactory.create(TransferRuleType.CHEAPEST);

      const result = strategy.calculate(zeroDistance, mockItem);

      expect(result.metric).toBe(0);
      expect(result.label).toBe('Cost: $0.00');
    });
  });

  describe('performance', () => {
    it('should create strategies efficiently', () => {
      const startTime = Date.now();

      // Create multiple strategies
      for (let i = 0; i < 1000; i++) {
        strategyFactory.create(TransferRuleType.FASTEST);
        strategyFactory.create(TransferRuleType.CHEAPEST);
      }

      const duration = Date.now() - startTime;

      // Should be very fast since strategies are cached
      expect(duration).toBeLessThan(100);
    });
  });
});