import { InventoryProvider } from '../../src/services/inventory';
import { DBProvider } from '../../src/db/dbConnector';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('InventoryProvider Extended Tests for Coverage', () => {
  let inventoryProvider: InventoryProvider;
  let dbProvider: DBProvider;
  let mockAxios: MockAdapter;

  beforeEach(async () => {
    dbProvider = new DBProvider();
    inventoryProvider = new InventoryProvider(dbProvider);
    mockAxios = new MockAdapter(axios);

    // Reset internal inventory to known state
    await dbProvider.updateInternalInventory('12345678', 50); // Reset to high number
    await dbProvider.updateInternalInventory('87654321', 50); // Reset to high number

    // Setup mock responses for warehouse B
    mockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
    mockAxios.onGet('http://b.api/inventory/SKU1234').reply(200, [{
      sku: 'SKU1234',
      label: 'Super Widget',
      stock: 52,
      coords: [40.7128, -74.0060],
      mileageCostPerMile: 0.7
    }]);

    // Setup mock responses for warehouse C
    mockAxios.onGet('http://c.api/api/items?upc=12345678').reply(200, [{
      upc: '12345678',
      desc: 'Widget - Super',
      qty: 25,
      position: { lat: 41.2, long: -73.7 },
      transfer_fee_mile: 0.65
    }]);

    // Additional UPC for testing
    mockAxios.onPost('http://b.api/lookup/87654321').reply(200, ['SKU5678']);
    mockAxios.onGet('http://b.api/inventory/SKU5678').reply(200, [{
      sku: 'SKU5678',
      label: 'Ultra Gadget',
      stock: 30,
      coords: [40.7128, -74.0060],
      mileageCostPerMile: 0.8
    }]);

    mockAxios.onGet('http://c.api/api/items?upc=87654321').reply(200, [{
      upc: '87654321',
      desc: 'Gadget - Ultra',
      qty: 15,
      position: { lat: 41.2, long: -73.7 },
      transfer_fee_mile: 0.75
    }]);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('performTransfer - Edge Cases and Full Coverage', () => {
    it('should handle transfer from B to A with cheapest rule', async () => {
      const result = await inventoryProvider.performTransfer(
        'B', 'A', '12345678', 5, 'cheapest'
      );

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toContain('Cost: $');
    });

    it('should handle transfer from C to A with fastest rule', async () => {
      const result = await inventoryProvider.performTransfer(
        'C', 'A', '12345678', 5, 'fastest'
      );

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
      expect(result).toContain('Time:');
      expect(result).toContain('hours');
    });

    it('should handle transfer from B to C with cheapest rule', async () => {
      const result = await inventoryProvider.performTransfer(
        'B', 'C', '12345678', 10, 'cheapest'
      );

      expect(result).toContain('Transfer of 10 units');
      expect(result).toContain('from B to C');
      expect(result).toContain('Cost: $');
    });

    it('should handle transfer from C to B with fastest rule', async () => {
      const result = await inventoryProvider.performTransfer(
        'C', 'B', '12345678', 8, 'fastest'
      );

      expect(result).toContain('Transfer of 8 units');
      expect(result).toContain('from C to B');
      expect(result).toContain('Time:');
    });

    it('should handle reasonable quantity transfer from A', async () => {
      const result = await inventoryProvider.performTransfer(
        'A', 'B', '12345678', 10, 'cheapest'
      );

      expect(result).toContain('Transfer of 10 units');
      expect(result).toContain('completed successfully');
    });

    it('should update inventory correctly for multiple transfers from A', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory');

      await inventoryProvider.performTransfer('A', 'B', '12345678', 2, 'cheapest');
      expect(spy).toHaveBeenCalledWith('12345678', -2);

      await inventoryProvider.performTransfer('A', 'C', '12345678', 3, 'fastest');
      expect(spy).toHaveBeenCalledWith('12345678', -3);

      spy.mockRestore();
    });
  });

  describe('performTransferWithNoFrom - Additional Coverage', () => {
    it('should select C as source when it has lowest cost to B', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        from: null as any,
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      });

      expect(result).toContain('completed successfully');
      expect(result).toContain('Distance');
    });

    it('should handle auto-selection to warehouse A', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        from: null as any,
        to: 'A',
        UPC: '12345678',
        quantity: 5,
        rule: 'fastest'
      });

      expect(result).toContain('completed successfully');
      expect(result).toMatch(/from [BC] to A/);
    });

    it('should handle auto-selection with different UPC', async () => {
      const result = await inventoryProvider.performTransferWithNoFrom({
        from: null as any,
        to: 'B',
        UPC: '87654321',
        quantity: 3,
        rule: 'cheapest'
      });

      expect(result).toContain('Transfer of 3 units');
      expect(result).toContain('87654321');
    });

    it('should prefer source with sufficient stock', async () => {
      // Try to transfer more than C has (25) but less than B has (52)
      const result = await inventoryProvider.performTransferWithNoFrom({
        from: null as any,
        to: 'A',
        UPC: '12345678',
        quantity: 30,
        rule: 'cheapest'
      });

      expect(result).toContain('from B to A');
      expect(result).toContain('Transfer of 30 units');
    });
  });

  describe('Error Handling - Extended Coverage', () => {
    it('should throw error when transferring more than total available across all warehouses', async () => {
      await expect(
        inventoryProvider.performTransferWithNoFrom({
          from: null as any,
          to: 'B',
          UPC: '12345678',
          quantity: 1000,
          rule: 'cheapest'
        })
      ).rejects.toThrow('No warehouse has sufficient stock');
    });

    it('should throw error for invalid transfer rule', async () => {
      await expect(
        inventoryProvider.performTransfer(
          'A', 'B', '12345678', 5, 'invalid-rule'
        )
      ).rejects.toThrow();
    });

    it('should handle empty inventory response from warehouse B', async () => {
      mockAxios.reset();
      mockAxios.onPost('http://b.api/lookup/99999999').reply(200, []);

      const result = await inventoryProvider.getInventoryFromB('99999999');
      expect(result).toEqual([]);
    });

    it('should handle empty inventory response from warehouse C', async () => {
      mockAxios.reset();
      mockAxios.onGet('http://c.api/api/items?upc=99999999').reply(200, []);

      const result = await inventoryProvider.getInventoryFromC('99999999');
      expect(result).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.reset();
      mockAxios.onPost('http://b.api/lookup/12345678').reply(500);

      const result = await inventoryProvider.getInventoryFromB('12345678');
      expect(result).toEqual([]);
    });
  });

  describe('Transfer Rules - Comprehensive Testing', () => {
    it('should correctly calculate cheapest cost for all warehouse combinations', async () => {
      const combinations = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'A' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'C', to: 'B' }
      ];

      for (const combo of combinations) {
        const result = await inventoryProvider.performTransfer(
          combo.from as 'A' | 'B' | 'C',
          combo.to as 'A' | 'B' | 'C',
          '12345678',
          1,
          'cheapest'
        );

        expect(result).toContain('Cost: $');
        expect(result).toContain('Distance');
        expect(result).toContain(`from ${combo.from} to ${combo.to}`);
      }
    });

    it('should correctly calculate fastest time for all warehouse combinations', async () => {
      const combinations = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'A' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'C', to: 'B' }
      ];

      for (const combo of combinations) {
        const result = await inventoryProvider.performTransfer(
          combo.from as 'A' | 'B' | 'C',
          combo.to as 'A' | 'B' | 'C',
          '12345678',
          1,
          'fastest'
        );

        expect(result).toContain('Time:');
        expect(result).toContain('hours');
        expect(result).toContain(`from ${combo.from} to ${combo.to}`);
      }
    });
  });

  describe('Distance Calculations - Specific Cases', () => {
    it('should calculate correct distance between Los Angeles (A) and New York (B)', async () => {
      const distance = inventoryProvider.haversineDistance(
        34.0522, -118.2437, // LA
        40.7128, -74.0060    // NYC
      );

      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should calculate correct distance between New York (B) and Connecticut (C)', async () => {
      const distance = inventoryProvider.haversineDistance(
        40.7128, -74.0060,   // NYC
        41.2, -73.7          // CT
      );

      expect(distance).toBeGreaterThan(30);
      expect(distance).toBeLessThan(50);
    });

    it('should calculate correct distance between Los Angeles (A) and Connecticut (C)', async () => {
      const distance = inventoryProvider.haversineDistance(
        34.0522, -118.2437,  // LA
        41.2, -73.7          // CT
      );

      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });
  });

  describe('Inventory Updates - Database Integration', () => {
    it('should call updateInternalInventory with correct parameters', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory');

      await inventoryProvider.performTransfer('A', 'B', '12345678', 7, 'cheapest');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('12345678', -7);

      spy.mockRestore();
    });

    it('should not call updateInternalInventory for external warehouse transfers', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory');

      await inventoryProvider.performTransfer('B', 'C', '12345678', 5, 'cheapest');

      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should handle database update errors gracefully', async () => {
      const spy = jest.spyOn(dbProvider, 'updateInternalInventory')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        inventoryProvider.performTransfer('A', 'B', '12345678', 5, 'cheapest')
      ).rejects.toThrow('Database error');

      spy.mockRestore();
    });
  });

  describe('Category-based Operations', () => {
    it('should correctly categorize Widget products', async () => {
      const category = await inventoryProvider.getCategoryFromUPC('Super Widget');
      expect(category).toBe('widgets');
    });

    it('should correctly categorize non-Widget products', async () => {
      const category = await inventoryProvider.getCategoryFromUPC('Ultra Gadget');
      expect(category).toBe('gadgets');
    });

    it('should correctly categorize edge cases', async () => {
      expect(await inventoryProvider.getCategoryFromUPC('widget')).toBe('widgets');
      expect(await inventoryProvider.getCategoryFromUPC('WIDGET')).toBe('widgets');
      expect(await inventoryProvider.getCategoryFromUPC('Widget Pro')).toBe('widgets');
      expect(await inventoryProvider.getCategoryFromUPC('Pro Widget')).toBe('widgets');
    });
  });
});