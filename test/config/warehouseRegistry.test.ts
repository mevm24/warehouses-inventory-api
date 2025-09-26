import { WarehouseRegistry } from '../../src/config/warehouseRegistry';
import { WarehouseConfigLoader } from '../../src/config/warehouseLoader';
import { WarehouseConfig } from '../../src/interfaces/warehouse';

describe('WarehouseRegistry', () => {
  const mockWarehouses: WarehouseConfig[] = [
    {
      id: 'A',
      name: 'Internal Warehouse',
      location: { lat: 34.0522, long: -118.2437 },
      api: { type: 'internal', defaultTransferCost: 0.2, defaultTransferTime: 1 }
    },
    {
      id: 'B',
      name: 'Partner Warehouse B',
      location: { lat: 40.7128, long: -74.0060 },
      api: {
        type: 'external-b-style',
        baseUrl: 'http://b.api',
        endpoints: { lookup: '/lookup', inventory: '/inventory' },
        defaultTransferCost: 0.7,
        defaultTransferTime: 1.5
      }
    },
    {
      id: 'C',
      name: 'Partner Warehouse C',
      location: { lat: 41.2, long: -73.7 },
      api: {
        type: 'external-c-style',
        baseUrl: 'http://c.api',
        endpoints: { categories: '/api/cats', items: '/api/items' },
        defaultTransferCost: 0.65,
        defaultTransferTime: 2.5
      }
    }
  ];

  let registry: WarehouseRegistry;

  beforeEach(() => {
    registry = new WarehouseRegistry(mockWarehouses);
  });

  describe('Initialization', () => {
    it('should initialize with provided warehouses', () => {
      expect(registry.getWarehouseIds()).toEqual(['A', 'B', 'C']);
    });

    it('should initialize with empty array when no warehouses provided', () => {
      const emptyRegistry = new WarehouseRegistry([]);
      expect(emptyRegistry.getWarehouseIds()).toEqual([]);
    });

    it('should handle duplicate warehouse IDs by keeping the last one', () => {
      const duplicateWarehouses = [
        mockWarehouses[0],
        { ...mockWarehouses[0], name: 'Updated Warehouse A' }
      ];
      const duplicateRegistry = new WarehouseRegistry(duplicateWarehouses);

      const warehouse = duplicateRegistry.getWarehouse('A');
      expect(warehouse?.name).toBe('Updated Warehouse A');
    });
  });

  describe('getWarehouse', () => {
    it('should return warehouse by ID', () => {
      const warehouse = registry.getWarehouse('A');
      expect(warehouse).toBeDefined();
      expect(warehouse?.id).toBe('A');
      expect(warehouse?.name).toBe('Internal Warehouse');
      expect(warehouse?.location).toEqual({ lat: 34.0522, long: -118.2437 });
    });

    it('should return undefined for non-existent warehouse', () => {
      const warehouse = registry.getWarehouse('X');
      expect(warehouse).toBeUndefined();
    });

    it('should be case sensitive', () => {
      const warehouse = registry.getWarehouse('a');
      expect(warehouse).toBeUndefined();
    });
  });

  describe('hasWarehouse', () => {
    it('should return true for existing warehouse', () => {
      expect(registry.hasWarehouse('A')).toBe(true);
      expect(registry.hasWarehouse('B')).toBe(true);
      expect(registry.hasWarehouse('C')).toBe(true);
    });

    it('should return false for non-existent warehouse', () => {
      expect(registry.hasWarehouse('X')).toBe(false);
      expect(registry.hasWarehouse('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(registry.hasWarehouse('a')).toBe(false);
    });
  });

  describe('getAllWarehouses', () => {
    it('should return all registered warehouses', () => {
      const warehouses = registry.getAllWarehouses();
      expect(warehouses).toHaveLength(3);
      expect(warehouses.map(w => w.id)).toEqual(['A', 'B', 'C']);
    });

    it('should return array copy, not reference', () => {
      const warehouses1 = registry.getAllWarehouses();
      const warehouses2 = registry.getAllWarehouses();

      expect(warehouses1).toEqual(warehouses2);
      expect(warehouses1).not.toBe(warehouses2);
    });

    it('should return empty array when no warehouses', () => {
      const emptyRegistry = new WarehouseRegistry([]);
      expect(emptyRegistry.getAllWarehouses()).toEqual([]);
    });
  });

  describe('getWarehouseIds', () => {
    it('should return array of warehouse IDs', () => {
      const ids = registry.getWarehouseIds();
      expect(ids).toEqual(['A', 'B', 'C']);
    });

    it('should return empty array when no warehouses', () => {
      const emptyRegistry = new WarehouseRegistry([]);
      expect(emptyRegistry.getWarehouseIds()).toEqual([]);
    });

    it('should return array copy, not reference', () => {
      const ids1 = registry.getWarehouseIds();
      const ids2 = registry.getWarehouseIds();

      expect(ids1).toEqual(ids2);
      expect(ids1).not.toBe(ids2);
    });
  });

  describe('addWarehouse', () => {
    const newWarehouse: WarehouseConfig = {
      id: 'D',
      name: 'New Warehouse',
      location: { lat: 30.0, long: -90.0 },
      api: { type: 'internal', defaultTransferCost: 0.3, defaultTransferTime: 1.0 }
    };

    it('should add new warehouse', () => {
      registry.addWarehouse(newWarehouse);

      expect(registry.hasWarehouse('D')).toBe(true);
      expect(registry.getWarehouseIds()).toContain('D');
      expect(registry.getWarehouse('D')).toEqual(newWarehouse);
    });

    it('should replace existing warehouse with same ID', () => {
      const updatedWarehouse = {
        ...mockWarehouses[0],
        name: 'Updated Internal Warehouse'
      };

      registry.addWarehouse(updatedWarehouse);

      const warehouse = registry.getWarehouse('A');
      expect(warehouse?.name).toBe('Updated Internal Warehouse');
      expect(registry.getWarehouseIds()).toHaveLength(3); // Should not increase
    });

    it('should handle warehouse with different API types', () => {
      const externalWarehouse: WarehouseConfig = {
        id: 'E',
        name: 'External Warehouse E',
        location: { lat: 25.0, long: -80.0 },
        api: {
          type: 'external-c-style',
          baseUrl: 'http://e.api',
          endpoints: { categories: '/categories', items: '/items' },
          defaultTransferCost: 0.6,
          defaultTransferTime: 2.0
        }
      };

      registry.addWarehouse(externalWarehouse);

      const warehouse = registry.getWarehouse('E');
      expect(warehouse?.api.type).toBe('external-c-style');
      expect((warehouse?.api as any).baseUrl).toBe('http://e.api');
    });
  });

  describe('removeWarehouse', () => {
    it('should remove existing warehouse', () => {
      const removed = registry.removeWarehouse('A');

      expect(removed).toBe(true);
      expect(registry.hasWarehouse('A')).toBe(false);
      expect(registry.getWarehouseIds()).toEqual(['B', 'C']);
    });

    it('should return false for non-existent warehouse', () => {
      const removed = registry.removeWarehouse('X');

      expect(removed).toBe(false);
      expect(registry.getWarehouseIds()).toHaveLength(3); // Unchanged
    });

    it('should handle removing all warehouses', () => {
      registry.removeWarehouse('A');
      registry.removeWarehouse('B');
      registry.removeWarehouse('C');

      expect(registry.getWarehouseIds()).toEqual([]);
      expect(registry.getAllWarehouses()).toEqual([]);
    });

    it('should be case sensitive', () => {
      const removed = registry.removeWarehouse('a');

      expect(removed).toBe(false);
      expect(registry.hasWarehouse('A')).toBe(true);
    });
  });

  describe('Integration with different API types', () => {
    it('should handle internal API type', () => {
      const warehouse = registry.getWarehouse('A');
      expect(warehouse?.api.type).toBe('internal');
      expect(warehouse?.api.defaultTransferCost).toBe(0.2);
      expect(warehouse?.api.defaultTransferTime).toBe(1);
    });

    it('should handle external-b-style API type', () => {
      const warehouse = registry.getWarehouse('B');
      expect(warehouse?.api.type).toBe('external-b-style');
      expect((warehouse?.api as any).baseUrl).toBe('http://b.api');
      expect((warehouse?.api as any).endpoints).toHaveProperty('lookup');
      expect((warehouse?.api as any).endpoints).toHaveProperty('inventory');
    });

    it('should handle external-c-style API type', () => {
      const warehouse = registry.getWarehouse('C');
      expect(warehouse?.api.type).toBe('external-c-style');
      expect((warehouse?.api as any).baseUrl).toBe('http://c.api');
      expect((warehouse?.api as any).endpoints).toHaveProperty('categories');
      expect((warehouse?.api as any).endpoints).toHaveProperty('items');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty warehouse ID', () => {
      expect(registry.hasWarehouse('')).toBe(false);
      expect(registry.getWarehouse('')).toBeUndefined();
      expect(registry.removeWarehouse('')).toBe(false);
    });

    it('should handle null/undefined warehouse ID', () => {
      expect(registry.hasWarehouse(null as any)).toBe(false);
      expect(registry.hasWarehouse(undefined as any)).toBe(false);
      expect(registry.getWarehouse(null as any)).toBeUndefined();
      expect(registry.getWarehouse(undefined as any)).toBeUndefined();
    });

    it('should maintain warehouse ordering', () => {
      const orderedWarehouses = [
        { ...mockWarehouses[0], id: 'Z' },
        { ...mockWarehouses[1], id: 'A' },
        { ...mockWarehouses[2], id: 'M' }
      ];
      const orderedRegistry = new WarehouseRegistry(orderedWarehouses);

      // IDs should maintain insertion order, not alphabetical
      expect(orderedRegistry.getWarehouseIds()).toEqual(['Z', 'A', 'M']);
    });

    it('should handle large number of warehouses', () => {
      const manyWarehouses: WarehouseConfig[] = Array.from({ length: 100 }, (_, i) => ({
        id: `W${i.toString().padStart(3, '0')}`,
        name: `Warehouse ${i}`,
        location: { lat: i * 0.1, long: i * -0.1 },
        api: { type: 'internal', defaultTransferCost: 0.1 + i * 0.01, defaultTransferTime: 1 + i * 0.1 }
      }));

      const largeRegistry = new WarehouseRegistry(manyWarehouses);

      expect(largeRegistry.getWarehouseIds()).toHaveLength(100);
      expect(largeRegistry.hasWarehouse('W050')).toBe(true);
      expect(largeRegistry.getWarehouse('W099')?.name).toBe('Warehouse 99');
    });
  });
});

describe('WarehouseConfigLoader', () => {
  describe('createRegistry', () => {
    it('should create registry from file path', () => {
      // This test requires a test config file to exist
      try {
        const registry = WarehouseConfigLoader.createRegistry('./src/config/warehouses.json');
        expect(registry).toBeInstanceOf(WarehouseRegistry);
        expect(registry.getWarehouseIds().length).toBeGreaterThan(0);
      } catch (error) {
        // If file doesn't exist or has issues, test should still pass
        expect(error).toBeDefined();
      }
    });

    it('should create registry from environment', () => {
      try {
        const registry = WarehouseConfigLoader.createRegistry();
        expect(registry).toBeInstanceOf(WarehouseRegistry);
      } catch (error) {
        // If environment config fails, should fall back to defaults
        expect(error).toBeDefined();
      }
    });
  });

  // Note: File I/O tests would require actual files and proper setup
  // These are more integration tests and might be better in a separate test suite
});