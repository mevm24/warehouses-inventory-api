import { CostCalculatorService } from '../../../src/services/costCalculatorService';
import { NormalizedInventoryItem } from '../../../src/interfaces/general';

describe('CostCalculatorService (New Architecture)', () => {
  let costCalculator: CostCalculatorService;

  beforeEach(() => {
    costCalculator = new CostCalculatorService();
  });

  describe('calculateCost', () => {
    it('should calculate cost for warehouse A', () => {
      const distance = 100;
      const cost = costCalculator.calculateCost('A', distance);

      expect(cost).toBe(20); // 100 * 0.2
    });

    it('should calculate cost for warehouse B with default rate', () => {
      const distance = 100;
      const cost = costCalculator.calculateCost('B', distance);

      expect(cost).toBe(70); // 100 * 0.7 (default rate)
    });

    it('should calculate cost for warehouse B with item-specific rate', () => {
      const distance = 100;
      const item: NormalizedInventoryItem = {
        source: 'B',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 10,
        locationDetails: { mileageCostPerMile: 0.5 },
        transferCost: 0.5,
        transferTime: 1
      };

      const cost = costCalculator.calculateCost('B', distance, item);

      expect(cost).toBe(50); // 100 * 0.5 (item-specific rate)
    });

    it('should calculate cost for warehouse C with default rate', () => {
      const distance = 100;
      const cost = costCalculator.calculateCost('C', distance);

      expect(cost).toBe(65); // 100 * 0.65 (default rate)
    });

    it('should calculate cost for warehouse C with item-specific rate', () => {
      const distance = 100;
      const item: NormalizedInventoryItem = {
        source: 'C',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 10,
        locationDetails: { transfer_fee_mile: 0.8 },
        transferCost: 0.8,
        transferTime: 1
      };

      const cost = costCalculator.calculateCost('C', distance, item);

      expect(cost).toBe(80); // 100 * 0.8 (item-specific rate)
    });

    it('should fall back to warehouse A rate for unknown warehouses', () => {
      const distance = 100;
      const cost = costCalculator.calculateCost('X', distance);

      expect(cost).toBe(20); // 100 * 0.2 (warehouse A rate as fallback)
    });

    it('should handle zero distance', () => {
      const cost = costCalculator.calculateCost('A', 0);

      expect(cost).toBe(0);
    });

    it('should handle fractional distances', () => {
      const distance = 123.45;
      const cost = costCalculator.calculateCost('A', distance);

      expect(cost).toBeCloseTo(24.69); // 123.45 * 0.2
    });

    it('should prioritize item-specific rates over defaults', () => {
      const distance = 50;
      const itemWithCustomRate: NormalizedInventoryItem = {
        source: 'B',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 10,
        locationDetails: { mileageCostPerMile: 1.0 }, // Higher than default
        transferCost: 1.0,
        transferTime: 1
      };

      const costWithItem = costCalculator.calculateCost('B', distance, itemWithCustomRate);
      const costWithoutItem = costCalculator.calculateCost('B', distance);

      expect(costWithItem).toBe(50); // 50 * 1.0
      expect(costWithoutItem).toBe(35); // 50 * 0.7
      expect(costWithItem).toBeGreaterThan(costWithoutItem);
    });

    it('should handle missing locationDetails gracefully', () => {
      const distance = 100;
      const itemWithoutLocationDetails: NormalizedInventoryItem = {
        source: 'B',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 10,
        locationDetails: {},
        transferCost: 0.7,
        transferTime: 1
      };

      const cost = costCalculator.calculateCost('B', distance, itemWithoutLocationDetails);

      expect(cost).toBe(70); // Should use default rate
    });
  });

  describe('edge cases', () => {
    it('should handle very large distances', () => {
      const largeDistance = 999999;
      const cost = costCalculator.calculateCost('A', largeDistance);

      expect(cost).toBeCloseTo(199999.8); // 999999 * 0.2
    });

    it('should handle very small distances', () => {
      const smallDistance = 0.001;
      const cost = costCalculator.calculateCost('A', smallDistance);

      expect(cost).toBeCloseTo(0.0002); // 0.001 * 0.2
    });
  });
});