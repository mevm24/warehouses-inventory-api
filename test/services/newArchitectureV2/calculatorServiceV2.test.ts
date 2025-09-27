import { UnifiedCostCalculatorService, UnifiedTimeCalculatorService } from '../../../src/services/unifiedCalculatorService';
import { IWarehouseRegistryService } from '../../../src/services/warehouseRegistryService';
import { WarehouseConfig } from '../../../src/interfaces/warehouse';
import { NormalizedInventoryItemV2 } from '../../../src/interfaces/general';

describe('CalculatorServiceV2', () => {
  const mockWarehouseRegistry: jest.Mocked<IWarehouseRegistryService> = {
    getAllWarehouses: jest.fn(),
    hasWarehouse: jest.fn(),
    registerWarehouse: jest.fn(),
    unregisterWarehouse: jest.fn(),
    getWarehouse: jest.fn(),
  };

  const internalWarehouse: WarehouseConfig = {
    id: 'A',
    name: 'Internal Warehouse',
    location: { lat: 40.7128, long: -74.0060 },
    api: {
      type: 'internal',
      defaultTransferCost: 0.25,
      defaultTransferTime: 1.5
    }
  };

  const externalBWarehouse: WarehouseConfig = {
    id: 'B',
    name: 'External B Warehouse',
    location: { lat: 34.0522, long: -118.2437 },
    api: {
      type: 'external-b-style',
      baseUrl: 'http://b.api',
      defaultTransferCost: 0.8,
      defaultTransferTime: 2.0
    }
  };

  const externalCWarehouse: WarehouseConfig = {
    id: 'C',
    name: 'External C Warehouse',
    location: { lat: 41.8781, long: -87.6298 },
    api: {
      type: 'external-c-style',
      baseUrl: 'http://c.api',
      defaultTransferCost: 0.75,
      defaultTransferTime: 3.0
    }
  };

  const unknownWarehouse: WarehouseConfig = {
    id: 'UNKNOWN',
    name: 'Unknown Warehouse',
    location: { lat: 0, long: 0 },
    api: { type: 'unknown' as any }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UnifiedCostCalculatorService (V2 Mode)', () => {
    let calculator: UnifiedCostCalculatorService;

    beforeEach(() => {
      calculator = new UnifiedCostCalculatorService(mockWarehouseRegistry);
    });

    it('should calculate cost using item-specific transfer cost', () => {
      const item: NormalizedInventoryItemV2 = {
        source: 'A',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Item',
        quantity: 10,
        locationDetails: {},
        transferCost: 1.5,
        transferTime: 2
      };

      mockWarehouseRegistry.getWarehouse.mockReturnValue(internalWarehouse);

      const cost = calculator.calculateCost('A', 100, item);
      expect(cost).toBe(150); // 100 miles * 1.5 cost per mile
    });

    it('should calculate cost using warehouse default cost', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(internalWarehouse);

      const cost = calculator.calculateCost('A', 100);
      expect(cost).toBe(25); // 100 miles * 0.25 default cost
    });

    it('should calculate cost using warehouse type fallback for internal', () => {
      const warehouseWithoutDefault = {
        ...internalWarehouse,
        api: { type: 'internal' as const }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const cost = calculator.calculateCost('A', 100);
      expect(cost).toBe(20); // 100 miles * 0.2 internal fallback
    });

    it('should calculate cost using warehouse type fallback for external-b-style', () => {
      const warehouseWithoutDefault = {
        ...externalBWarehouse,
        api: { type: 'external-b-style' as const, baseUrl: 'http://b.api' }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const cost = calculator.calculateCost('B', 100);
      expect(cost).toBe(70); // 100 miles * 0.7 external-b fallback
    });

    it('should calculate cost using warehouse type fallback for external-c-style', () => {
      const warehouseWithoutDefault = {
        ...externalCWarehouse,
        api: { type: 'external-c-style' as const, baseUrl: 'http://c.api' }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const cost = calculator.calculateCost('C', 100);
      expect(cost).toBe(65); // 100 miles * 0.65 external-c fallback
    });

    it('should use default cost for unknown warehouse types', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(unknownWarehouse);

      const cost = calculator.calculateCost('UNKNOWN', 100);
      expect(cost).toBe(50); // 100 miles * 0.5 default fallback
    });

    it('should use default cost for non-existent warehouses', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(undefined);

      const cost = calculator.calculateCost('NONEXISTENT', 100);
      expect(cost).toBe(50); // 100 miles * 0.5 default fallback
    });
  });

  describe('UnifiedTimeCalculatorService (V2 Mode)', () => {
    let calculator: UnifiedTimeCalculatorService;

    beforeEach(() => {
      calculator = new UnifiedTimeCalculatorService(mockWarehouseRegistry);
    });

    it('should calculate time using warehouse default time for internal', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(internalWarehouse);

      const time = calculator.calculateTime('A', 120);
      expect(time).toBe(5.5); // 1.5 base time + (120 / 30) travel time
    });

    it('should calculate time using warehouse default time for external-b', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(externalBWarehouse);

      const time = calculator.calculateTime('B', 90);
      expect(time).toBe(5.0); // 2.0 base time + (90 / 30) travel time
    });

    it('should calculate time using warehouse default time for external-c', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(externalCWarehouse);

      const time = calculator.calculateTime('C', 60);
      expect(time).toBe(5.0); // 3.0 base time + (60 / 30) travel time
    });

    it('should calculate time using type fallback for internal warehouse', () => {
      const warehouseWithoutDefault = {
        ...internalWarehouse,
        api: { type: 'internal' as const }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const time = calculator.calculateTime('A', 120);
      expect(time).toBe(2.0); // 120 / 60 (fast internal processing)
    });

    it('should calculate time using type fallback for external-b-style warehouse', () => {
      const warehouseWithoutDefault = {
        ...externalBWarehouse,
        api: { type: 'external-b-style' as const, baseUrl: 'http://b.api' }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const time = calculator.calculateTime('B', 90);
      expect(time).toBe(4.0); // 1 hour processing + (90 / 30) travel time
    });

    it('should calculate time using type fallback for external-c-style warehouse', () => {
      const warehouseWithoutDefault = {
        ...externalCWarehouse,
        api: { type: 'external-c-style' as const, baseUrl: 'http://c.api' }
      };
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseWithoutDefault);

      const time = calculator.calculateTime('C', 75);
      expect(time).toBe(5.0); // 2 hours processing + (75 / 25) travel time
    });

    it('should use default calculation for unknown warehouse types', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(unknownWarehouse);

      const time = calculator.calculateTime('UNKNOWN', 60);
      expect(time).toBe(2.0); // 60 / 30 default calculation
    });

    it('should use default calculation for non-existent warehouses', () => {
      mockWarehouseRegistry.getWarehouse.mockReturnValue(undefined);

      const time = calculator.calculateTime('NONEXISTENT', 90);
      expect(time).toBe(3.0); // 90 / 30 default calculation
    });
  });
});