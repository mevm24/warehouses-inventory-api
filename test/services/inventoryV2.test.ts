import { InventoryProviderV2 } from '../../src/services/inventoryV2';
import { DBProvider } from '../../src/db/dbConnector';
import { WarehouseRegistry } from '../../src/config/warehouseRegistry';
import { NormalizedInventoryItemV2, TransferRequestV2 } from '../../src/interfaces/general';
import { WarehouseConfig } from '../../src/interfaces/warehouse';
import '../../src/data';

describe('InventoryProviderV2 Service', () => {
  let inventoryProvider: InventoryProviderV2;
  let dbProvider: DBProvider;
  let warehouseRegistry: WarehouseRegistry;

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
      id: 'D',
      name: 'West Coast Hub',
      location: { lat: 47.6062, long: -122.3321 },
      api: {
        type: 'external-b-style',
        baseUrl: 'http://d.api',
        endpoints: { lookup: '/lookup', inventory: '/inventory' },
        defaultTransferCost: 0.5,
        defaultTransferTime: 1.2
      }
    },
    {
      id: 'E',
      name: 'Midwest Distribution',
      location: { lat: 41.8781, long: -87.6298 },
      api: {
        type: 'external-c-style',
        baseUrl: 'http://e.api',
        endpoints: { categories: '/api/categories', items: '/api/products' },
        defaultTransferCost: 0.55,
        defaultTransferTime: 2.0
      }
    }
  ];

  beforeEach(() => {
    dbProvider = new DBProvider();
    warehouseRegistry = new WarehouseRegistry(mockWarehouses);
    inventoryProvider = new InventoryProviderV2(dbProvider, warehouseRegistry);
  });

  describe('Initialization', () => {
    it('should initialize with warehouse adapters', () => {
      expect(inventoryProvider.getWarehouseIds()).toEqual(['A', 'B', 'D', 'E']);
    });

    it('should have transfer rules', () => {
      expect(inventoryProvider.transferRules).toHaveProperty('fastest');
      expect(inventoryProvider.transferRules).toHaveProperty('cheapest');
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // Access private method through any
      const distance = (inventoryProvider as any).haversineDistance(
        40.7128, -74.0060,  // NYC
        34.0522, -118.2437  // LA
      );

      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for same coordinates', () => {
      const distance = (inventoryProvider as any).haversineDistance(
        40.7128, -74.0060,
        40.7128, -74.0060
      );

      expect(distance).toBe(0);
    });
  });

  describe('getInventoryFromWarehouse', () => {
    it('should fetch inventory from internal warehouse A', async () => {
      const items = await inventoryProvider.getInventoryFromWarehouse('A');

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('source', 'A');
      expect(items[0]).toHaveProperty('upc');
      expect(items[0]).toHaveProperty('category');
      expect(items[0]).toHaveProperty('quantity');
    });

    it('should fetch inventory from external warehouse B', async () => {
      const items = await inventoryProvider.getInventoryFromWarehouse('B', '12345678');

      expect(items).toBeInstanceOf(Array);
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('source', 'B');
        expect(items[0]).toHaveProperty('upc', '12345678');
        expect(items[0]).toHaveProperty('locationDetails');
      }
    });

    it('should fetch inventory from warehouse D', async () => {
      const items = await inventoryProvider.getInventoryFromWarehouse('D', '11111111');

      expect(items).toBeInstanceOf(Array);
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('source', 'D');
        expect(items[0]).toHaveProperty('locationDetails');
      }
    });

    it('should fetch inventory from warehouse E', async () => {
      const items = await inventoryProvider.getInventoryFromWarehouse('E', '11111111');

      expect(items).toBeInstanceOf(Array);
      if (items.length > 0) {
        expect(items[0]).toHaveProperty('source', 'E');
        expect(items[0]).toHaveProperty('locationDetails');
      }
    });

    it('should throw error for non-existent warehouse', async () => {
      await expect(
        inventoryProvider.getInventoryFromWarehouse('X')
      ).rejects.toThrow('Warehouse X not found');
    });
  });

  describe('getAllInventory', () => {
    it('should aggregate inventory from all warehouses', async () => {
      const items = await inventoryProvider.getAllInventory('12345678');

      expect(items).toBeInstanceOf(Array);

      const sources = items.map(item => item.source);
      expect(sources).toContain('A');
    });

    it('should filter by category across all warehouses', async () => {
      const items = await inventoryProvider.getAllInventory(undefined, 'widgets');

      expect(items).toBeInstanceOf(Array);
      if (items.length > 0) {
        expect(items.every(item => item.category === 'widgets')).toBe(true);
      }
    });

    it('should handle errors from individual warehouses gracefully', async () => {
      const items = await inventoryProvider.getAllInventory('99999999');

      expect(items).toBeInstanceOf(Array);
    });
  });

  describe('calculateTransferMetrics', () => {
    const sourceWarehouse = mockWarehouses[0]; // A
    const destWarehouse = mockWarehouses[1];   // B
    const mockItem: NormalizedInventoryItemV2 = {
      source: 'A',
      upc: '12345678',
      category: 'widgets',
      name: 'Test Widget',
      quantity: 10,
      locationDetails: { mileageCostPerMile: 0.5 },
      transferCost: 5.0,
      transferTime: 2.0
    };

    it('should calculate cost metric for cheapest rule', () => {
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        sourceWarehouse, destWarehouse, mockItem, 'cheapest'
      );

      expect(metrics.metric).toBeGreaterThan(0);
      expect(metrics.distance).toBeGreaterThan(0);
      expect(metrics.metricLabel).toContain('Cost: $');
    });

    it('should calculate time metric for fastest rule', () => {
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        sourceWarehouse, destWarehouse, mockItem, 'fastest'
      );

      expect(metrics.metric).toBeGreaterThan(0);
      expect(metrics.distance).toBeGreaterThan(0);
      expect(metrics.metricLabel).toContain('Time:');
      expect(metrics.metricLabel).toContain('hours');
    });

    it('should use rule function for custom rules', () => {
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        sourceWarehouse, destWarehouse, mockItem, 'custom'
      );

      expect(metrics.metric).toBeDefined();
      expect(metrics.distance).toBeGreaterThan(0);
      expect(metrics.metricLabel).toBeDefined();
    });
  });

  describe('performTransfer', () => {
    it('should successfully transfer with sufficient stock', async () => {
      const result = await inventoryProvider.performTransfer(
        'A', 'B', '12345678', 5, 'cheapest'
      );

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Cost: \$[0-9]+\.[0-9]+/);
    });

    it('should auto-select source warehouse when from is null', async () => {
      const result = await inventoryProvider.performTransfer(
        null, 'B', '12345678', 5, 'cheapest'
      );

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Cost: \$[0-9]+\.[0-9]+/);
    });

    it('should throw error for non-existent destination warehouse', async () => {
      await expect(
        inventoryProvider.performTransfer('A', 'X', '12345678', 5, 'cheapest')
      ).rejects.toThrow('Destination warehouse X not found');
    });

    it('should throw error for non-existent source warehouse', async () => {
      await expect(
        inventoryProvider.performTransfer('X', 'B', '12345678', 5, 'cheapest')
      ).rejects.toThrow('Source warehouse X not found');
    });

    it('should throw error for non-existent UPC', async () => {
      await expect(
        inventoryProvider.performTransfer('A', 'B', '99999999', 5, 'cheapest')
      ).rejects.toThrow('No inventory found for UPC 99999999');
    });

    it('should work with fastest rule', async () => {
      const result = await inventoryProvider.performTransfer(
        'A', 'B', '12345678', 5, 'fastest'
      );

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Time: [0-9]+\.[0-9]+ hours/);
    });
  });

  describe('selectBestSourceWarehouse', () => {
    const mockInventory: NormalizedInventoryItemV2[] = [
      {
        source: 'A',
        upc: '12345678',
        category: 'widgets',
        name: 'Widget A',
        quantity: 10,
        locationDetails: {},
        transferCost: 5.0,
        transferTime: 2.0
      },
      {
        source: 'B',
        upc: '12345678',
        category: 'widgets',
        name: 'Widget B',
        quantity: 15,
        locationDetails: {},
        transferCost: 7.0,
        transferTime: 3.0
      }
    ];

    it('should select best source based on cheapest rule', async () => {
      const bestSource = await (inventoryProvider as any).selectBestSourceWarehouse(
        mockInventory, 'D', 5, 'cheapest'
      );

      expect(['A', 'B']).toContain(bestSource);
    });

    it('should select best source based on fastest rule', async () => {
      const bestSource = await (inventoryProvider as any).selectBestSourceWarehouse(
        mockInventory, 'D', 5, 'fastest'
      );

      expect(['A', 'B']).toContain(bestSource);
    });

    it('should exclude destination warehouse as source', async () => {
      const bestSource = await (inventoryProvider as any).selectBestSourceWarehouse(
        mockInventory, 'A', 5, 'cheapest'
      );

      expect(bestSource).toBe('B');
    });

    it('should throw error when no warehouse has sufficient stock', async () => {
      await expect(
        (inventoryProvider as any).selectBestSourceWarehouse(
          mockInventory, 'D', 100, 'cheapest'
        )
      ).rejects.toThrow('No warehouse has sufficient stock');
    });
  });

  describe('Warehouse Management', () => {
    const newWarehouse: WarehouseConfig = {
      id: 'F',
      name: 'New Warehouse',
      location: { lat: 35.0, long: -80.0 },
      api: { type: 'internal', defaultTransferCost: 0.3, defaultTransferTime: 1.0 }
    };

    it('should add new warehouse', async () => {
      await inventoryProvider.addWarehouse(newWarehouse);

      expect(inventoryProvider.getWarehouseIds()).toContain('F');
    });

    it('should remove warehouse', () => {
      const removed = inventoryProvider.removeWarehouse('B');

      expect(removed).toBe(true);
      expect(inventoryProvider.getWarehouseIds()).not.toContain('B');
    });

    it('should return false when removing non-existent warehouse', () => {
      const removed = inventoryProvider.removeWarehouse('X');

      expect(removed).toBe(false);
    });

    it('should get warehouse IDs', () => {
      const ids = inventoryProvider.getWarehouseIds();

      expect(ids).toEqual(['A', 'B', 'D', 'E']);
    });
  });

  describe('Transfer Rules', () => {
    const mockItem: NormalizedInventoryItemV2 = {
      source: 'A',
      upc: '12345678',
      category: 'widgets',
      name: 'Test Widget',
      quantity: 10,
      locationDetails: {},
      transferCost: 5.5,
      transferTime: 2.5
    };

    it('should have fastest rule that returns transfer time', () => {
      const rule = inventoryProvider.transferRules['fastest'];
      expect(rule(mockItem)).toBe(2.5);
    });

    it('should have cheapest rule that returns transfer cost', () => {
      const rule = inventoryProvider.transferRules['cheapest'];
      expect(rule(mockItem)).toBe(5.5);
    });

    it('should be extensible with new rules', () => {
      inventoryProvider.transferRules['test'] = (item) => item.quantity;
      const rule = inventoryProvider.transferRules['test'];
      expect(rule(mockItem)).toBe(10);
    });
  });
});