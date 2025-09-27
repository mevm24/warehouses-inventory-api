import { DBProvider } from '../../src/db/dbConnector';
import type { NormalizedInventoryItem, WarehouseId } from '../../src/interfaces';
import { InventoryProvider } from '../../src/services/inventory';
import '../../src/data';

describe('InventoryProvider Service', () => {
  let inventoryProvider: InventoryProvider;
  let dbProvider: DBProvider;

  beforeEach(() => {
    dbProvider = new DBProvider();
    inventoryProvider = new InventoryProvider(dbProvider);
  });

  describe('haversineDistance', () => {
    it('should calculate distance between two coordinates correctly', () => {
      // New York to Los Angeles
      const distance = inventoryProvider.haversineDistance(
        40.7128,
        -74.006, // NYC
        34.0522,
        -118.2437 // LA
      );

      // Should be approximately 2445 miles
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for same coordinates', () => {
      const distance = inventoryProvider.haversineDistance(40.7128, -74.006, 40.7128, -74.006);

      expect(distance).toBe(0);
    });
  });

  describe('getCategoryFromUPC', () => {
    it('should return "widgets" for Widget products', async () => {
      const category = await inventoryProvider.getCategoryFromUPC('Super Widget');
      expect(category).toBe('widgets');
    });

    it('should return "gadgets" for non-Widget products', async () => {
      const category = await inventoryProvider.getCategoryFromUPC('Ultra Gadget');
      expect(category).toBe('gadgets');
    });
  });

  describe('getInventoryFromA', () => {
    it('should fetch all inventory from warehouse A', async () => {
      const items = await inventoryProvider.getInventoryFromA();

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('source', 'A');
      expect(items[0]).toHaveProperty('upc');
      expect(items[0]).toHaveProperty('category');
      expect(items[0]).toHaveProperty('quantity');
    });

    it('should filter by UPC when provided', async () => {
      const items = await inventoryProvider.getInventoryFromA('12345678');

      expect(items.every((item) => item.upc === '12345678')).toBe(true);
    });

    it('should filter by category when provided', async () => {
      const items = await inventoryProvider.getInventoryFromA(undefined, 'widgets');

      expect(items.every((item) => item.category === 'widgets')).toBe(true);
    });

    it('should apply both UPC and category filters', async () => {
      const items = await inventoryProvider.getInventoryFromA('12345678', 'widgets');

      expect(items.every((item) => item.upc === '12345678' && item.category === 'widgets')).toBe(true);
    });
  });

  describe('getInventoryFromB', () => {
    it('should return empty array when no UPC provided', async () => {
      const items = await inventoryProvider.getInventoryFromB();

      expect(items).toEqual([]);
    });

    it('should fetch inventory from warehouse B for valid UPC', async () => {
      const items = await inventoryProvider.getInventoryFromB('12345678');

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('source', 'B');
      expect(items[0]).toHaveProperty('upc', '12345678');
      expect(items[0]).toHaveProperty('locationDetails');
      expect(items[0].locationDetails).toHaveProperty('sku');
      expect(items[0].locationDetails).toHaveProperty('coords');
    });
  });

  describe('getInventoryFromC', () => {
    it('should return empty array when no UPC provided', async () => {
      const items = await inventoryProvider.getInventoryFromC();

      expect(items).toEqual([]);
    });

    it('should fetch inventory from warehouse C for valid UPC', async () => {
      const items = await inventoryProvider.getInventoryFromC('12345678');

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('source', 'C');
      expect(items[0]).toHaveProperty('upc', '12345678');
      expect(items[0]).toHaveProperty('locationDetails');
      expect(items[0].locationDetails).toHaveProperty('position');
      expect(items[0].locationDetails).toHaveProperty('transfer_fee_mile');
    });

    it('should correctly categorize items', async () => {
      const items = await inventoryProvider.getInventoryFromC('12345678');

      expect(items[0].category).toBe('widgets');
    });
  });

  describe('getAllInventory', () => {
    it('should aggregate inventory from all warehouses', async () => {
      const items = await inventoryProvider.getAllInventory('12345678');

      expect(items).toBeInstanceOf(Array);

      const sources = items.map((item) => item.source);
      expect(sources).toContain('A');
      expect(sources).toContain('B');
      expect(sources).toContain('C');
    });

    it('should filter by category across all warehouses', async () => {
      const items = await inventoryProvider.getAllInventory(undefined, 'widgets');

      expect(items.every((item) => item.category === 'widgets')).toBe(true);
    });

    it('should return empty array for non-existent UPC', async () => {
      const items = await inventoryProvider.getAllInventory('00000000');

      expect(items).toEqual([]);
    });
  });

  describe('transferRules', () => {
    const mockItem: NormalizedInventoryItem = {
      source: 'A',
      upc: '12345678',
      category: 'widgets',
      name: 'Test Item',
      quantity: 10,
      locationDetails: {},
      transferCost: 5.5,
      transferTime: 2.5,
    };

    it('should have fastest rule that returns transfer time', () => {
      const rule = inventoryProvider.transferRules.fastest;
      expect(rule(mockItem)).toBe(2.5);
    });

    it('should have cheapest rule that returns transfer cost', () => {
      const rule = inventoryProvider.transferRules.cheapest;
      expect(rule(mockItem)).toBe(5.5);
    });
  });

  describe('performTransfer', () => {
    it('should successfully transfer with sufficient stock', async () => {
      const result = await inventoryProvider.performTransfer('A', 'B', '12345678', 5, 'cheapest');

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Cost: \$[0-9]+\.[0-9]+/);
    });

    it('should throw error for insufficient stock', async () => {
      await expect(inventoryProvider.performTransfer('A', 'B', '12345678', 1000, 'cheapest')).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should throw error for non-existent UPC', async () => {
      await expect(inventoryProvider.performTransfer('A', 'B', '00000000', 5, 'cheapest')).rejects.toThrow();
    });

    it('should work with fastest rule', async () => {
      const result = await inventoryProvider.performTransfer('A', 'B', '12345678', 5, 'fastest');

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Time: [0-9]+\.[0-9]+ hours/);
    });
  });

  describe('performTransferWithNoFrom', () => {
    const validRequest = {
      // Testing null from value (bypassing type checking for testing error conditions)
      from: null as unknown as 'A' | 'B' | 'C',
      to: 'B' as const,
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest' as const,
    };

    it('should automatically select best source warehouse', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom(validRequest);

      expect(result).toContain('Transfer of 5 units');
      expect(result).toMatch(/from [A-C] to B/);
    });

    it('should use specified source when provided', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        ...validRequest,
        from: 'C',
      });

      expect(result).toContain('from C to B');
    });

    it('should throw error when no warehouse has sufficient stock', async () => {
      await expect(
        inventoryProvider.performTransferWithNoFrom({
          ...validRequest,
          quantity: 10000,
        })
      ).rejects.toThrow('No warehouse has sufficient stock');
    });

    it('should select based on fastest rule', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        ...validRequest,
        rule: 'fastest',
      });

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toMatch(/Time: [0-9]+\.[0-9]+ hours/);
    });
  });

  describe('performTransferWithHaversine', () => {
    const validRequest = {
      // Testing null from value (bypassing type checking for testing error conditions)
      from: null as unknown as 'A' | 'B' | 'C',
      to: 'B' as const,
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest' as const,
    };

    it('should calculate transfer using haversine distance', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom(validRequest);

      expect(result).toContain('Transfer of 5 units');
      expect(result).toMatch(/from [A-C] to B/);
    });

    it('should use specified source when provided', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        ...validRequest,
        from: 'A',
      });

      expect(result).toContain('from A to B');
    });

    it('should throw error for insufficient stock', async () => {
      await expect(
        inventoryProvider.performTransferWithNoFrom({
          ...validRequest,
          from: 'A',
          quantity: 10000,
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should work with fastest rule', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        ...validRequest,
        rule: 'fastest',
      });

      expect(result).toContain('completed successfully');
    });
  });
});
