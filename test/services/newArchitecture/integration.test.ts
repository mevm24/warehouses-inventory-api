import { Container } from '../../../src/container/container';
import { IInventoryService, ITransferService } from '../../../src/interfaces/services';
import { TransferRequest } from '../../../src/interfaces/general';
import '../../../src/data';

describe('New Architecture Integration Tests', () => {
  let container: Container;
  let inventoryService: IInventoryService;
  let transferService: ITransferService;

  beforeAll(() => {
    container = Container.getInstance();
    inventoryService = container.getInventoryService();
    transferService = container.getTransferService();
  });

  describe('Full workflow integration', () => {
    it('should complete full inventory query and transfer workflow', async () => {
      // Step 1: Query inventory across all warehouses
      const allInventory = await inventoryService.getAllInventory('12345678');

      expect(allInventory).toBeInstanceOf(Array);
      expect(allInventory.length).toBeGreaterThan(0);

      // Verify we have items from multiple warehouses
      const sources = new Set(allInventory.map(item => item.source));
      expect(sources.size).toBeGreaterThan(1);

      // Step 2: Perform a transfer using the new service
      const transferRequest: TransferRequest = {
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 1,
        rule: 'cheapest'
      };

      const transferResult = await transferService.performTransfer(transferRequest);

      expect(transferResult).toContain('Transfer of 1 units');
      expect(transferResult).toContain('from A to B');
      expect(transferResult).toContain('completed successfully');
    });

    it('should handle optimal transfer selection', async () => {
      const optimalRequest = {
        to: 'A' as const,
        UPC: '12345678',
        quantity: 2,
        rule: 'fastest' as const
      };

      const result = await transferService.performOptimalTransfer(optimalRequest);

      expect(result).toContain('Transfer of 2 units');
      expect(result).toContain('to A');
      expect(result).toContain('completed successfully');
      expect(result).toContain('Time:');
    });

    it('should work with category-based queries', async () => {
      const widgetInventory = await inventoryService.getAllInventory(undefined, 'widgets');

      expect(widgetInventory).toBeInstanceOf(Array);
      expect(widgetInventory.length).toBeGreaterThan(0);
      expect(widgetInventory.every(item => item.category === 'widgets')).toBe(true);
    });

    it('should handle both transfer rules correctly', async () => {
      const cheapestRequest: TransferRequest = {
        from: 'A',
        to: 'C',
        UPC: '12345678',
        quantity: 1,
        rule: 'cheapest'
      };

      const fastestRequest: TransferRequest = {
        from: 'A',
        to: 'C',
        UPC: '12345678',
        quantity: 1,
        rule: 'fastest'
      };

      const cheapestResult = await transferService.performTransfer(cheapestRequest);
      const fastestResult = await transferService.performTransfer(fastestRequest);

      expect(cheapestResult).toContain('Cost: $');
      expect(fastestResult).toContain('Time:');
      expect(fastestResult).toContain('hours');
    });
  });

  describe('Error handling integration', () => {
    it('should handle invalid transfer requests gracefully', async () => {
      const invalidRequest: TransferRequest = {
        from: 'A',
        to: 'A', // Same source and destination
        UPC: '12345678',
        quantity: 1,
        rule: 'cheapest'
      };

      await expect(transferService.performTransfer(invalidRequest))
        .rejects.toThrow('Source and destination warehouses cannot be the same');
    });

    it('should handle insufficient inventory gracefully', async () => {
      const excessiveRequest: TransferRequest = {
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 10000, // Way more than available
        rule: 'cheapest'
      };

      await expect(transferService.performTransfer(excessiveRequest))
        .rejects.toThrow('Insufficient stock');
    });

    it('should handle non-existent UPC gracefully', async () => {
      const inventory = await inventoryService.getAllInventory('00000000');

      expect(inventory).toEqual([]);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle multiple concurrent inventory queries', async () => {
      const promises = Array(10).fill(null).map(() =>
        inventoryService.getAllInventory('12345678')
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should handle multiple concurrent transfers', async () => {
      const transferPromises = Array(5).fill(null).map((_, index) => {
        const request: TransferRequest = {
          from: 'A',
          to: 'B',
          UPC: '12345678',
          quantity: 1,
          rule: index % 2 === 0 ? 'cheapest' : 'fastest'
        };
        return transferService.performTransfer(request);
      });

      const results = await Promise.all(transferPromises);

      results.forEach(result => {
        expect(result).toContain('completed successfully');
      });
    });
  });

  describe('Comparison with legacy system', () => {
    it('should provide same core functionality as legacy system', async () => {
      // Test that new architecture provides same basic capabilities
      const inventory = await inventoryService.getAllInventory('12345678');

      // Should have items from all warehouses (A, B, C)
      const sources = inventory.map(item => item.source);
      expect(sources).toContain('A');

      // Should have proper structure
      inventory.forEach(item => {
        expect(item).toHaveProperty('source');
        expect(item).toHaveProperty('upc');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('transferCost');
        expect(item).toHaveProperty('transferTime');
      });
    });

    it('should handle all the same transfer scenarios', async () => {
      const scenarios = [
        { from: 'A', to: 'B', rule: 'cheapest' },
        { from: 'A', to: 'C', rule: 'fastest' },
        { from: 'B', to: 'A', rule: 'cheapest' },
        { from: 'C', to: 'A', rule: 'fastest' }
      ];

      for (const scenario of scenarios) {
        const request: TransferRequest = {
          from: scenario.from as any,
          to: scenario.to as any,
          UPC: '12345678',
          quantity: 1,
          rule: scenario.rule as any
        };

        const result = await transferService.performTransfer(request);

        expect(result).toContain('completed successfully');
        expect(result).toContain(`from ${scenario.from} to ${scenario.to}`);
      }
    });
  });

  describe('Dependency injection verification', () => {
    it('should use singleton container pattern', () => {
      const container1 = Container.getInstance();
      const container2 = Container.getInstance();

      expect(container1).toBe(container2);
    });

    it('should provide consistent service instances', () => {
      const inventoryService1 = container.getInventoryService();
      const inventoryService2 = container.getInventoryService();

      expect(inventoryService1).toBe(inventoryService2);
    });

    it('should properly wire all dependencies', () => {
      // Test that all services are properly instantiated
      expect(inventoryService).toBeDefined();
      expect(transferService).toBeDefined();

      // Test that services can be retrieved by generic get method
      const genericInventoryService = container.get('InventoryService');
      const genericTransferService = container.get('TransferService');

      expect(genericInventoryService).toBe(inventoryService);
      expect(genericTransferService).toBe(transferService);
    });
  });
});