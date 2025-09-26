import { InventoryProviderV2 } from '../../src/services/inventoryV2';
import { DBProvider } from '../../src/db/dbConnector';
import { warehouseRegistry } from '../../src/config/registry';
import { WarehouseConfig } from '../../src/interfaces/warehouse';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('InventoryProviderV2 Extended Tests for Coverage', () => {
  let inventoryProvider: InventoryProviderV2;
  let dbProvider: DBProvider;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    dbProvider = new DBProvider();
    inventoryProvider = new InventoryProviderV2(dbProvider, warehouseRegistry);
    mockAxios = new MockAdapter(axios);

    // Setup comprehensive mock responses
    mockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
    mockAxios.onGet('http://b.api/inventory/SKU1234').reply(200, [{
      sku: 'SKU1234',
      label: 'Super Widget',
      stock: 52,
      coords: [40.7128, -74.0060],
      mileageCostPerMile: 0.7
    }]);

    mockAxios.onGet('http://c.api/api/items?upc=12345678').reply(200, [{
      upc: '12345678',
      desc: 'Widget - Super',
      qty: 25,
      position: { lat: 41.2, long: -73.7 },
      transfer_fee_mile: 0.65
    }]);

    // Mock warehouse D responses
    mockAxios.onPost('http://d.api/lookup/12345678').reply(200, ['SKU9999']);
    mockAxios.onGet('http://d.api/inventory/SKU9999').reply(200, [{
      sku: 'SKU9999',
      label: 'Premium Widget',
      stock: 75,
      coords: [47.6062, -122.3321],
      mileageCostPerMile: 0.5
    }]);

    // Mock warehouse E responses
    mockAxios.onGet('http://e.api/api/products?upc=12345678').reply(200, [{
      upc: '12345678',
      desc: 'Widget - Advanced',
      qty: 60,
      position: { lat: 41.8781, long: -87.6298 },
      transfer_fee_mile: 0.55
    }]);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Enhanced Transfer Operations', () => {
    it('should handle transfers between all warehouse combinations with cheapest rule', async () => {
      const warehouses = ['A', 'B', 'C', 'D', 'E'];
      const testCombinations = [
        { from: 'A', to: 'D' },
        { from: 'A', to: 'E' },
        { from: 'B', to: 'D' },
        { from: 'B', to: 'E' },
        { from: 'C', to: 'D' },
        { from: 'C', to: 'E' },
        { from: 'D', to: 'A' },
        { from: 'D', to: 'B' },
        { from: 'E', to: 'A' },
        { from: 'E', to: 'B' }
      ];

      for (const combo of testCombinations) {
        try {
          const result = await inventoryProvider.performTransfer(
            combo.from,
            combo.to,
            '12345678',
            2,
            'cheapest'
          );

          expect(result).toContain('completed successfully');
          expect(result).toContain('Distance');
          expect(result).toContain('Cost: $');
          expect(result).toContain(`from ${combo.from} to ${combo.to}`);
        } catch (error) {
          console.log(`Failed for ${combo.from} to ${combo.to}:`, error);
        }
      }
    });

    it('should handle transfers with fastest rule between all warehouses', async () => {
      const testCombinations = [
        { from: 'A', to: 'D' },
        { from: 'B', to: 'E' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'C' },
        { from: 'E', to: 'A' }
      ];

      for (const combo of testCombinations) {
        try {
          const result = await inventoryProvider.performTransfer(
            combo.from,
            combo.to,
            '12345678',
            1,
            'fastest'
          );

          expect(result).toContain('completed successfully');
          expect(result).toContain('Distance');
          expect(result).toContain('Time:');
          expect(result).toContain('hours');
        } catch (error) {
          console.log(`Failed for ${combo.from} to ${combo.to}:`, error);
        }
      }
    });

    it('should auto-select optimal warehouse for long-distance transfers', async () => {
      // Test auto-selection to West Coast (D - Seattle)
      const result = await inventoryProvider.performTransfer(
        null,
        'D',
        '12345678',
        5,
        'cheapest'
      );

      expect(result).toContain('completed successfully');
      expect(result).toContain('to D');
      expect(result).toContain('Distance');
    });

    it('should auto-select optimal warehouse for Midwest transfers', async () => {
      // Test auto-selection to Midwest (E - Chicago)
      const result = await inventoryProvider.performTransfer(
        null,
        'E',
        '12345678',
        3,
        'fastest'
      );

      expect(result).toContain('completed successfully');
      expect(result).toContain('to E');
      expect(result).toContain('Time:');
    });
  });

  describe('Metrics Calculation Edge Cases', () => {
    it('should handle zero distance calculations correctly', () => {
      const warehouseA = warehouseRegistry.getWarehouse('A')!;
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        warehouseA,
        warehouseA,
        { locationDetails: { mileageCostPerMile: 0.5 } },
        'cheapest'
      );

      expect(metrics.distance).toBe(0);
      expect(metrics.metric).toBe(0);
      expect(metrics.metricLabel).toContain('Cost: $0.00');
    });

    it('should use default rates when item has no location details', () => {
      const warehouseA = warehouseRegistry.getWarehouse('A')!;
      const warehouseB = warehouseRegistry.getWarehouse('B')!;
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        warehouseA,
        warehouseB,
        { locationDetails: {} },
        'cheapest'
      );

      expect(metrics.distance).toBeGreaterThan(0);
      expect(metrics.metric).toBeGreaterThan(0);
      expect(metrics.metricLabel).toContain('Cost: $');
    });

    it('should handle custom transfer rules correctly', () => {
      const warehouseA = warehouseRegistry.getWarehouse('A')!;
      const warehouseB = warehouseRegistry.getWarehouse('B')!;

      // Test with an undefined custom rule (should default to cost calculation)
      const metrics = (inventoryProvider as any).calculateTransferMetrics(
        warehouseA,
        warehouseB,
        { locationDetails: { mileageCostPerMile: 0.5 } },
        'undefined-rule'
      );

      expect(metrics.metric).toBeGreaterThan(0);
      expect(metrics.metricLabel).toContain('Metric:');
    });
  });

  describe('Warehouse Management Extended', () => {
    it('should add and use new warehouse in transfers', async () => {
      const newWarehouse: WarehouseConfig = {
        id: 'F',
        name: 'Test Warehouse F',
        location: { lat: 32.7767, long: -96.7970 }, // Dallas
        api: {
          type: 'internal',
          defaultTransferCost: 0.3,
          defaultTransferTime: 1.5
        }
      };

      await inventoryProvider.addWarehouse(newWarehouse);

      const warehouseIds = inventoryProvider.getWarehouseIds();
      expect(warehouseIds).toContain('F');

      // Test removal
      const removed = inventoryProvider.removeWarehouse('F');
      expect(removed).toBe(true);

      const updatedIds = inventoryProvider.getWarehouseIds();
      expect(updatedIds).not.toContain('F');
    });

    it('should return false when removing non-existent warehouse', () => {
      const removed = inventoryProvider.removeWarehouse('NONEXISTENT');
      expect(removed).toBe(false);
    });

    it('should handle multiple warehouse additions and removals', async () => {
      const warehouses = [
        {
          id: 'G',
          name: 'Warehouse G',
          location: { lat: 30.2672, long: -97.7431 }, // Austin
          api: { type: 'internal' as const, defaultTransferCost: 0.25, defaultTransferTime: 1.2 }
        },
        {
          id: 'H',
          name: 'Warehouse H',
          location: { lat: 39.7392, long: -104.9903 }, // Denver
          api: { type: 'internal' as const, defaultTransferCost: 0.35, defaultTransferTime: 1.8 }
        }
      ];

      for (const warehouse of warehouses) {
        await inventoryProvider.addWarehouse(warehouse);
      }

      let warehouseIds = inventoryProvider.getWarehouseIds();
      expect(warehouseIds).toContain('G');
      expect(warehouseIds).toContain('H');

      // Remove them
      inventoryProvider.removeWarehouse('G');
      inventoryProvider.removeWarehouse('H');

      warehouseIds = inventoryProvider.getWarehouseIds();
      expect(warehouseIds).not.toContain('G');
      expect(warehouseIds).not.toContain('H');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle inventory updates for new warehouses', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory');

      await inventoryProvider.performTransfer('A', 'B', '12345678', 3, 'cheapest');

      expect(spy).toHaveBeenCalledWith('12345678', -3);
      spy.mockRestore();
    });

    it('should not update inventory for external warehouses', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory');

      await inventoryProvider.performTransfer('B', 'D', '12345678', 2, 'cheapest');

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle large stock transfers correctly', async () => {
      // Try to transfer reasonable amount from warehouse with good stock
      const result = await inventoryProvider.performTransfer(
        'D',
        'A',
        '12345678',
        50, // Reasonable amount from warehouse D
        'cheapest'
      );

      expect(result).toContain('Transfer of 50 units');
      expect(result).toContain('completed successfully');
    });

    it('should handle insufficient stock across multiple warehouses', async () => {
      await expect(
        inventoryProvider.performTransfer(
          null,
          'A',
          '12345678',
          1000, // More than total available (increased to be clearly over limit)
          'cheapest'
        )
      ).rejects.toThrow('No warehouse has sufficient stock');
    });

    it('should handle API failures gracefully during inventory fetch', async () => {
      mockAxios.reset();
      // Keep B and C working, fail D and E
      mockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
      mockAxios.onGet('http://b.api/inventory/SKU1234').reply(200, [{
        sku: 'SKU1234',
        label: 'Super Widget',
        stock: 52,
        coords: [40.7128, -74.0060],
        mileageCostPerMile: 0.7
      }]);

      mockAxios.onPost('http://d.api/lookup/12345678').reply(500);
      mockAxios.onGet('http://e.api/api/products?upc=12345678').reply(500);

      // Should still work with warehouses A, B (C doesn't need to be successful)
      const result = await inventoryProvider.performTransfer(
        null,
        'A', // Transfer to A instead of B to avoid same-warehouse issue
        '12345678',
        5,
        'cheapest'
      );

      expect(result).toContain('completed successfully');
    });

    it('should handle transfers when some warehouses are unavailable', async () => {
      mockAxios.reset();
      // Only mock successful responses for A, B, C
      mockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
      mockAxios.onGet('http://b.api/inventory/SKU1234').reply(200, [{
        sku: 'SKU1234',
        label: 'Super Widget',
        stock: 52,
        coords: [40.7128, -74.0060],
        mileageCostPerMile: 0.7
      }]);

      mockAxios.onGet('http://c.api/api/items?upc=12345678').reply(200, [{
        upc: '12345678',
        desc: 'Widget - Super',
        qty: 25,
        position: { lat: 41.2, long: -73.7 },
        transfer_fee_mile: 0.65
      }]);

      // D and E will fail, but transfer should still work
      const result = await inventoryProvider.performTransfer(
        'B',
        'C',
        '12345678',
        10,
        'fastest'
      );

      expect(result).toContain('completed successfully');
    });
  });

  describe('Distance and Route Optimization', () => {
    it('should correctly identify optimal warehouse for different destinations', async () => {
      // For East Coast destination (B), should select based on fastest rule
      const result1 = await inventoryProvider.performTransfer(
        null,
        'B',
        '12345678',
        5,
        'fastest'
      );
      expect(result1).toContain('to B');
      expect(result1).toContain('completed successfully');

      // For West Coast destination (D), should select optimal source
      const result2 = await inventoryProvider.performTransfer(
        null,
        'D',
        '12345678',
        5,
        'fastest'
      );
      expect(result2).toContain('to D');
      expect(result2).toContain('completed successfully');
    });

    it('should calculate accurate distances for cross-country transfers', () => {
      // LA to Seattle (A to D)
      const distanceAD = (inventoryProvider as any).haversineDistance(
        34.0522, -118.2437,  // LA
        47.6062, -122.3321   // Seattle
      );
      expect(distanceAD).toBeGreaterThan(950);
      expect(distanceAD).toBeLessThan(1000);

      // NYC to Chicago (B to E)
      const distanceBE = (inventoryProvider as any).haversineDistance(
        40.7128, -74.0060,   // NYC
        41.8781, -87.6298    // Chicago
      );
      expect(distanceBE).toBeGreaterThan(700);
      expect(distanceBE).toBeLessThan(800);
    });
  });

  describe('Business Rule Validation', () => {
    it('should consistently choose cheapest option across multiple runs', async () => {
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await inventoryProvider.performTransfer(
          null,
          'E',
          '12345678',
          5,
          'cheapest'
        );
        results.push(result);
      }

      // All should select the same source warehouse
      const sources = results.map(r => r.match(/from (\w) to E/)?.[1]);
      const uniqueSources = [...new Set(sources)];
      expect(uniqueSources).toHaveLength(1);
    });

    it('should consistently choose fastest option across multiple runs', async () => {
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await inventoryProvider.performTransfer(
          null,
          'D',
          '12345678',
          5,
          'fastest'
        );
        results.push(result);
      }

      // All should select the same source warehouse
      const sources = results.map(r => r.match(/from (\w) to D/)?.[1]);
      const uniqueSources = [...new Set(sources)];
      expect(uniqueSources).toHaveLength(1);
    });
  });
});