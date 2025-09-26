import { InventoryService } from '../../../src/services/inventoryService';
import { WarehouseServiceFactory } from '../../../src/services/warehouseServices';
import { DBProvider } from '../../../src/db/dbConnector';
import { IWarehouseService } from '../../../src/interfaces/services';
import '../../../src/data';

describe('InventoryService (New Architecture)', () => {
  let inventoryService: InventoryService;
  let warehouseFactory: WarehouseServiceFactory;
  let mockWarehouseA: jest.Mocked<IWarehouseService>;
  let mockWarehouseB: jest.Mocked<IWarehouseService>;
  let mockWarehouseC: jest.Mocked<IWarehouseService>;

  beforeEach(() => {
    // Create mock warehouse services
    mockWarehouseA = {
      getInventory: jest.fn(),
      updateInventory: jest.fn()
    };

    mockWarehouseB = {
      getInventory: jest.fn(),
      updateInventory: jest.fn()
    };

    mockWarehouseC = {
      getInventory: jest.fn(),
      updateInventory: jest.fn()
    };

    // Mock the warehouse factory
    warehouseFactory = {
      create: jest.fn().mockImplementation((warehouseId: string) => {
        switch (warehouseId) {
          case 'A': return mockWarehouseA;
          case 'B': return mockWarehouseB;
          case 'C': return mockWarehouseC;
          default: throw new Error(`Unknown warehouse: ${warehouseId}`);
        }
      })
    } as any;

    inventoryService = new InventoryService(warehouseFactory);
  });

  describe('getAllInventory', () => {
    it('should aggregate inventory from all warehouses', async () => {
      // Setup mock responses
      const mockItemsA = [
        { source: 'A' as const, upc: '12345678', category: 'widgets', name: 'Widget A', quantity: 10, locationDetails: {}, transferCost: 0.2, transferTime: 1 }
      ];
      const mockItemsB = [
        { source: 'B' as const, upc: '12345678', category: 'widgets', name: 'Widget B', quantity: 5, locationDetails: {}, transferCost: 0.7, transferTime: 1.5 }
      ];
      const mockItemsC = [
        { source: 'C' as const, upc: '12345678', category: 'widgets', name: 'Widget C', quantity: 8, locationDetails: {}, transferCost: 0.65, transferTime: 2.5 }
      ];

      mockWarehouseA.getInventory.mockResolvedValue(mockItemsA);
      mockWarehouseB.getInventory.mockResolvedValue(mockItemsB);
      mockWarehouseC.getInventory.mockResolvedValue(mockItemsC);

      const result = await inventoryService.getAllInventory('12345678');

      expect(result).toHaveLength(3);
      expect(result).toEqual([...mockItemsA, ...mockItemsB, ...mockItemsC]);
      expect(warehouseFactory.create).toHaveBeenCalledWith('A');
      expect(warehouseFactory.create).toHaveBeenCalledWith('B');
      expect(warehouseFactory.create).toHaveBeenCalledWith('C');
    });

    it('should pass UPC and category filters to warehouse services', async () => {
      mockWarehouseA.getInventory.mockResolvedValue([]);
      mockWarehouseB.getInventory.mockResolvedValue([]);
      mockWarehouseC.getInventory.mockResolvedValue([]);

      await inventoryService.getAllInventory('12345678', 'widgets');

      expect(mockWarehouseA.getInventory).toHaveBeenCalledWith('12345678', 'widgets');
      expect(mockWarehouseB.getInventory).toHaveBeenCalledWith('12345678', 'widgets');
      expect(mockWarehouseC.getInventory).toHaveBeenCalledWith('12345678', 'widgets');
    });

    it('should handle empty responses from warehouses', async () => {
      mockWarehouseA.getInventory.mockResolvedValue([]);
      mockWarehouseB.getInventory.mockResolvedValue([]);
      mockWarehouseC.getInventory.mockResolvedValue([]);

      const result = await inventoryService.getAllInventory('99999999');

      expect(result).toEqual([]);
    });

    it('should handle warehouse errors gracefully', async () => {
      mockWarehouseA.getInventory.mockResolvedValue([
        { source: 'A' as const, upc: '12345678', category: 'widgets', name: 'Widget A', quantity: 10, locationDetails: {}, transferCost: 0.2, transferTime: 1 }
      ]);
      mockWarehouseB.getInventory.mockRejectedValue(new Error('Network error'));
      mockWarehouseC.getInventory.mockResolvedValue([]);

      // Should not throw, but might have partial results depending on implementation
      await expect(inventoryService.getAllInventory('12345678')).rejects.toThrow();
    });

    it('should call all warehouses in parallel', async () => {
      const startTime = Date.now();

      // Add delays to mock responses to test parallelization
      mockWarehouseA.getInventory.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 50))
      );
      mockWarehouseB.getInventory.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 50))
      );
      mockWarehouseC.getInventory.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 50))
      );

      await inventoryService.getAllInventory('12345678');

      const duration = Date.now() - startTime;
      // Should be closer to 50ms (parallel) than 150ms (sequential)
      expect(duration).toBeLessThan(120);
    });
  });

  describe('integration with real factory', () => {
    it('should work with real warehouse factory', async () => {
      const dbProvider = new DBProvider();
      const realFactory = new WarehouseServiceFactory(dbProvider);
      const realService = new InventoryService(realFactory);

      const result = await realService.getAllInventory('12345678');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.source === 'A')).toBe(true);
    });
  });
});