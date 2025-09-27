import type { ICostCalculatorV2, ITimeCalculatorV2, NormalizedInventoryItemV2 } from '../../../src/interfaces';
import {
  CheapestTransferStrategyV2,
  FastestTransferStrategyV2,
  TransferStrategyFactoryV2,
} from '../../../src/strategies/transferStrategiesV2';

describe('TransferStrategiesV2', () => {
  const mockCostCalculator: jest.Mocked<ICostCalculatorV2> = {
    calculateCost: jest.fn(),
  };

  const mockTimeCalculator: jest.Mocked<ITimeCalculatorV2> = {
    calculateTime: jest.fn(),
  };

  const mockItem: NormalizedInventoryItemV2 = {
    source: 'A',
    upc: '12345678',
    category: 'widgets',
    name: 'Test Widget',
    quantity: 10,
    locationDetails: {},
    transferCost: 0.5,
    transferTime: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FastestTransferStrategyV2', () => {
    let strategy: FastestTransferStrategyV2;

    beforeEach(() => {
      strategy = new FastestTransferStrategyV2(mockTimeCalculator);
    });

    it('should calculate fastest transfer strategy', () => {
      mockTimeCalculator.calculateTime.mockReturnValue(3.5);

      const result = strategy.calculate(150, mockItem);

      expect(mockTimeCalculator.calculateTime).toHaveBeenCalledWith('A', 150);
      expect(result).toEqual({
        metric: 3.5,
        label: 'Time: 3.50 hours',
      });
    });

    it('should format time with proper decimal places', () => {
      mockTimeCalculator.calculateTime.mockReturnValue(1.2345);

      const result = strategy.calculate(100, mockItem);

      expect(result.label).toBe('Time: 1.23 hours');
    });

    it('should handle zero time', () => {
      mockTimeCalculator.calculateTime.mockReturnValue(0);

      const result = strategy.calculate(0, mockItem);

      expect(result).toEqual({
        metric: 0,
        label: 'Time: 0.00 hours',
      });
    });
  });

  describe('CheapestTransferStrategyV2', () => {
    let strategy: CheapestTransferStrategyV2;

    beforeEach(() => {
      strategy = new CheapestTransferStrategyV2(mockCostCalculator);
    });

    it('should calculate cheapest transfer strategy', () => {
      mockCostCalculator.calculateCost.mockReturnValue(75.25);

      const result = strategy.calculate(150, mockItem);

      expect(mockCostCalculator.calculateCost).toHaveBeenCalledWith('A', 150, mockItem);
      expect(result).toEqual({
        metric: 75.25,
        label: 'Cost: $75.25',
      });
    });

    it('should format cost with proper decimal places', () => {
      mockCostCalculator.calculateCost.mockReturnValue(123.456);

      const result = strategy.calculate(200, mockItem);

      expect(result.label).toBe('Cost: $123.46');
    });

    it('should handle zero cost', () => {
      mockCostCalculator.calculateCost.mockReturnValue(0);

      const result = strategy.calculate(0, mockItem);

      expect(result).toEqual({
        metric: 0,
        label: 'Cost: $0.00',
      });
    });

    it('should pass item details to cost calculator', () => {
      const customItem: NormalizedInventoryItemV2 = {
        source: 'CUSTOM_WAREHOUSE',
        upc: '87654321',
        category: 'gadgets',
        name: 'Custom Gadget',
        quantity: 5,
        locationDetails: { special: true },
        transferCost: 1.2,
        transferTime: 3,
      };

      mockCostCalculator.calculateCost.mockReturnValue(50);

      strategy.calculate(100, customItem);

      expect(mockCostCalculator.calculateCost).toHaveBeenCalledWith('CUSTOM_WAREHOUSE', 100, customItem);
    });
  });

  describe('TransferStrategyFactoryV2', () => {
    let factory: TransferStrategyFactoryV2;

    beforeEach(() => {
      factory = new TransferStrategyFactoryV2(mockCostCalculator, mockTimeCalculator);
    });

    it('should create cheapest transfer strategy', () => {
      const strategy = factory.create('cheapest');
      expect(strategy).toBeInstanceOf(CheapestTransferStrategyV2);
    });

    it('should create fastest transfer strategy', () => {
      const strategy = factory.create('fastest');
      expect(strategy).toBeInstanceOf(FastestTransferStrategyV2);
    });

    it('should return cheapest strategy as default for unknown rule', () => {
      const strategy = factory.create('unknown-rule');
      expect(strategy).toBeInstanceOf(CheapestTransferStrategyV2);
    });

    it('should return cheapest strategy as default for empty string', () => {
      const strategy = factory.create('');
      expect(strategy).toBeInstanceOf(CheapestTransferStrategyV2);
    });

    it('should handle case-insensitive rule names', () => {
      const cheapestStrategy = factory.create('CHEAPEST');
      const fastestStrategy = factory.create('FASTEST');

      expect(cheapestStrategy).toBeInstanceOf(CheapestTransferStrategyV2);
      expect(fastestStrategy).toBeInstanceOf(FastestTransferStrategyV2);
    });

    it('should maintain strategy instances across calls', () => {
      const strategy1 = factory.create('cheapest');
      const strategy2 = factory.create('cheapest');

      expect(strategy1).toBe(strategy2); // Should return same instance
    });

    it('should create different instances for different strategies', () => {
      const cheapestStrategy = factory.create('cheapest');
      const fastestStrategy = factory.create('fastest');

      expect(cheapestStrategy).not.toBe(fastestStrategy);
    });
  });
});
