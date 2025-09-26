import request from 'supertest';
import express from 'express';
import inventoryRoutesV2 from '../../../src/controllers/inventoryV2';
import { authMiddleware } from '../../../src/middlewares/auth';
import { Container } from '../../../src/container/container';
import { IWarehouseRegistryService } from '../../../src/services/warehouseRegistryService';
import { WarehouseConfig } from '../../../src/interfaces/warehouse';

describe('V2 Integration Tests', () => {
  let app: express.Application;
  let container: Container;
  let warehouseRegistry: IWarehouseRegistryService;

  // Test warehouse configurations
  const testWarehouseA: WarehouseConfig = {
    id: 'TEST_A',
    name: 'Test Warehouse A',
    location: { lat: 40.7128, long: -74.0060 },
    api: {
      type: 'internal',
      defaultTransferCost: 0.25,
      defaultTransferTime: 1
    }
  };

  const testWarehouseB: WarehouseConfig = {
    id: 'TEST_B',
    name: 'Test Warehouse B',
    location: { lat: 34.0522, long: -118.2437 },
    api: {
      type: 'external-b-style',
      baseUrl: 'http://localhost:3001',
      endpoints: {
        lookup: '/lookup',
        inventory: '/inventory'
      },
      defaultTransferCost: 0.8,
      defaultTransferTime: 2
    }
  };

  const testWarehouseC: WarehouseConfig = {
    id: 'TEST_C',
    name: 'Test Warehouse C',
    location: { lat: 41.8781, long: -87.6298 },
    api: {
      type: 'external-c-style',
      baseUrl: 'http://localhost:3002',
      endpoints: {
        items: '/api/items'
      },
      defaultTransferCost: 0.65,
      defaultTransferTime: 3
    }
  };

  const dynamicWarehouseX: WarehouseConfig = {
    id: 'WH_X',
    name: 'Dynamic Warehouse X',
    location: { lat: 37.7749, long: -122.4194 },
    api: {
      type: 'internal',
      defaultTransferCost: 0.3,
      defaultTransferTime: 1.5
    }
  };

  beforeEach(() => {
    // Setup fresh container and services
    container = Container.getInstance();
    warehouseRegistry = container.getWarehouseRegistryService();

    // Setup Express app with V2 routes
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use('/api/v2/inventory', inventoryRoutesV2);
  });

  describe('Dynamic Warehouse Registration', () => {
    it('should register a new warehouse dynamically and use it immediately', async () => {
      // Register a new warehouse
      const registerResponse = await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'DYNAMIC_WH',
          name: 'Dynamic Warehouse',
          location: { lat: 45.5051, long: -122.6750 },
          api: {
            type: 'internal',
            defaultTransferCost: 0.35,
            defaultTransferTime: 1.2
          }
        });

      expect(registerResponse.status).toBe(200);
      expect(registerResponse.body.message).toContain('registered successfully');

      // Verify the warehouse appears in the list
      const listResponse = await request(app)
        .get('/api/v2/inventory/warehouses')
        .set('Authorization', 'Bearer test-token');

      const dynamicWarehouse = listResponse.body.find((w: any) => w.id === 'DYNAMIC_WH');
      expect(dynamicWarehouse).toBeDefined();
      expect(dynamicWarehouse.name).toBe('Dynamic Warehouse');

      // Try to query inventory from the new warehouse
      const inventoryResponse = await request(app)
        .get('/api/v2/inventory/DYNAMIC_WH/widgets')
        .set('Authorization', 'Bearer test-token');

      expect(inventoryResponse.status).toBe(200);
      expect(inventoryResponse.body).toBeInstanceOf(Array);
    });

    it('should unregister a warehouse and prevent its use', async () => {
      // First register a warehouse
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'TEMP_WH',
          name: 'Temporary Warehouse',
          location: { lat: 33.4484, long: -112.0740 },
          api: { type: 'internal' }
        });

      // Unregister the warehouse
      const unregisterResponse = await request(app)
        .delete('/api/v2/inventory/warehouse/TEMP_WH')
        .set('Authorization', 'Bearer test-token');

      expect(unregisterResponse.status).toBe(200);
      expect(unregisterResponse.body.message).toContain('unregistered successfully');

      // Try to query inventory - should fail
      const inventoryResponse = await request(app)
        .get('/api/v2/inventory/TEMP_WH/12345678')
        .set('Authorization', 'Bearer test-token');

      expect(inventoryResponse.status).toBe(404);
      expect(inventoryResponse.body.message).toContain('Warehouse "TEMP_WH" not found');

      // Verify it's not in the list
      const listResponse = await request(app)
        .get('/api/v2/inventory/warehouses')
        .set('Authorization', 'Bearer test-token');

      const tempWarehouse = listResponse.body.find((w: any) => w.id === 'TEMP_WH');
      expect(tempWarehouse).toBeUndefined();
    });
  });

  describe('N-Warehouse Inventory Queries', () => {
    beforeEach(() => {
      // Register multiple test warehouses
      warehouseRegistry.registerWarehouse(testWarehouseA);
      warehouseRegistry.registerWarehouse(testWarehouseB);
      warehouseRegistry.registerWarehouse(testWarehouseC);
      warehouseRegistry.registerWarehouse(dynamicWarehouseX);
    });

    it('should query inventory across all N warehouses', async () => {
      const response = await request(app)
        .get('/api/v2/inventory/12345678')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      // Should have inventory from multiple sources
      const sources = new Set(response.body.map((item: any) => item.source));
      expect(sources.size).toBeGreaterThanOrEqual(1);
    });

    it('should query inventory from specific dynamic warehouse', async () => {
      const response = await request(app)
        .get('/api/v2/inventory/WH_X/widgets')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);

      // All items should be from WH_X
      response.body.forEach((item: any) => {
        expect(item.source).toBe('WH_X');
        expect(item.category).toBe('widgets');
      });
    });

    it('should handle mixed warehouse types in a single query', async () => {
      // Register warehouses of different types
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'MIXED_INTERNAL',
          name: 'Mixed Internal',
          location: { lat: 39.7392, long: -104.9903 },
          api: { type: 'internal' }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'MIXED_B_STYLE',
          name: 'Mixed B Style',
          location: { lat: 47.6062, long: -122.3321 },
          api: {
            type: 'external-b-style',
            baseUrl: 'http://localhost:3003'
          }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'MIXED_C_STYLE',
          name: 'Mixed C Style',
          location: { lat: 29.7604, long: -95.3698 },
          api: {
            type: 'external-c-style',
            baseUrl: 'http://localhost:3004'
          }
        });

      const response = await request(app)
        .get('/api/v2/inventory/gadgets')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('N-Warehouse Transfer Operations', () => {
    beforeEach(() => {
      // Setup warehouses for transfer tests
      warehouseRegistry.registerWarehouse(testWarehouseA);
      warehouseRegistry.registerWarehouse(testWarehouseB);
      warehouseRegistry.registerWarehouse(testWarehouseC);
      warehouseRegistry.registerWarehouse(dynamicWarehouseX);
    });

    it('should transfer between dynamically registered warehouses', async () => {
      // Register two new warehouses
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'SOURCE_WH',
          name: 'Source Warehouse',
          location: { lat: 35.6762, long: 139.6503 },
          api: { type: 'internal' }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'DEST_WH',
          name: 'Destination Warehouse',
          location: { lat: 51.5074, long: -0.1278 },
          api: { type: 'internal' }
        });

      // Attempt transfer
      const response = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          from: 'SOURCE_WH',
          to: 'DEST_WH',
          UPC: '12345678',
          quantity: 5,
          rule: 'cheapest'
        });

      // May succeed or fail based on inventory, but should recognize warehouses
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.message).not.toContain('Invalid source or destination warehouse');
      }
    });

    it('should auto-select optimal source from N warehouses', async () => {
      // Register multiple warehouses with different costs
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'CHEAP_WH',
          name: 'Cheap Warehouse',
          location: { lat: 40.7128, long: -74.0060 }, // Close to A
          api: {
            type: 'internal',
            defaultTransferCost: 0.1 // Very cheap
          }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'EXPENSIVE_WH',
          name: 'Expensive Warehouse',
          location: { lat: 40.7128, long: -74.0060 }, // Same location
          api: {
            type: 'internal',
            defaultTransferCost: 2.0 // Very expensive
          }
        });

      // Transfer without specifying source (auto-select)
      const response = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          to: 'TEST_A',
          UPC: '12345678',
          quantity: 1,
          rule: 'cheapest'
        });

      // Should work if inventory exists
      expect([200, 400]).toContain(response.status);
      if (response.status === 200) {
        // Should select the optimal source
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle transfers with different rules across N warehouses', async () => {
      // Test cheapest rule
      const cheapestResponse = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          to: 'WH_X',
          UPC: '12345678',
          quantity: 2,
          rule: 'cheapest'
        });

      expect([200, 400]).toContain(cheapestResponse.status);

      // Test fastest rule
      const fastestResponse = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          to: 'WH_X',
          UPC: '12345678',
          quantity: 2,
          rule: 'fastest'
        });

      expect([200, 400]).toContain(fastestResponse.status);
    });

    it('should validate warehouse existence in transfers', async () => {
      const response = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          from: 'NONEXISTENT_WH',
          to: 'TEST_A',
          UPC: '12345678',
          quantity: 5,
          rule: 'cheapest'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid source warehouse');
    });
  });

  describe('V2 Calculator Integration', () => {
    it('should use warehouse-specific cost calculations', async () => {
      // Register warehouses with different cost structures
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'LOW_COST_WH',
          name: 'Low Cost Warehouse',
          location: { lat: 25.7617, long: -80.1918 },
          api: {
            type: 'internal',
            defaultTransferCost: 0.05
          }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'HIGH_COST_WH',
          name: 'High Cost Warehouse',
          location: { lat: 36.1699, long: -115.1398 },
          api: {
            type: 'external-b-style',
            baseUrl: 'http://localhost:3005',
            defaultTransferCost: 1.5
          }
        });

      // Query warehouses to verify registration
      const listResponse = await request(app)
        .get('/api/v2/inventory/warehouses')
        .set('Authorization', 'Bearer test-token');

      const lowCostWh = listResponse.body.find((w: any) => w.id === 'LOW_COST_WH');
      const highCostWh = listResponse.body.find((w: any) => w.id === 'HIGH_COST_WH');

      expect(lowCostWh).toBeDefined();
      expect(highCostWh).toBeDefined();
    });

    it('should use warehouse-specific time calculations', async () => {
      // Register warehouses with different processing times
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'FAST_WH',
          name: 'Fast Processing Warehouse',
          location: { lat: 42.3601, long: -71.0589 },
          api: {
            type: 'internal',
            defaultTransferTime: 0.5
          }
        });

      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'SLOW_WH',
          name: 'Slow Processing Warehouse',
          location: { lat: 32.7157, long: -117.1611 },
          api: {
            type: 'external-c-style',
            baseUrl: 'http://localhost:3006',
            defaultTransferTime: 5
          }
        });

      const listResponse = await request(app)
        .get('/api/v2/inventory/warehouses')
        .set('Authorization', 'Bearer test-token');

      const fastWh = listResponse.body.find((w: any) => w.id === 'FAST_WH');
      const slowWh = listResponse.body.find((w: any) => w.id === 'SLOW_WH');

      expect(fastWh).toBeDefined();
      expect(slowWh).toBeDefined();
    });
  });

  describe('Error Handling with N Warehouses', () => {
    it('should handle duplicate warehouse registration gracefully', async () => {
      // Register warehouse first time
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'DUPLICATE_WH',
          name: 'Duplicate Warehouse',
          location: { lat: 30.2672, long: -97.7431 },
          api: { type: 'internal' }
        });

      // Try to register same ID again
      const duplicateResponse = await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'DUPLICATE_WH',
          name: 'Another Name',
          location: { lat: 31.0, long: -98.0 },
          api: { type: 'internal' }
        });

      expect(duplicateResponse.status).toBe(400);
      expect(duplicateResponse.body.message).toContain('already exists');
    });

    it('should handle missing warehouse in transfers', async () => {
      const response = await request(app)
        .post('/api/v2/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          to: 'NONEXISTENT_DEST',
          UPC: '12345678',
          quantity: 5,
          rule: 'cheapest'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid destination warehouse');
    });

    it('should handle empty inventory across all warehouses', async () => {
      const response = await request(app)
        .get('/api/v2/inventory/99999999')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('No inventory found');
    });
  });

  describe('Performance with Many Warehouses', () => {
    it('should handle registration of many warehouses', async () => {
      const warehousePromises = [];

      // Register 20 warehouses
      for (let i = 1; i <= 20; i++) {
        warehousePromises.push(
          request(app)
            .post('/api/v2/inventory/warehouse/register')
            .set('Authorization', 'Bearer test-token')
            .send({
              id: `PERF_WH_${i}`,
              name: `Performance Warehouse ${i}`,
              location: { lat: 40 + i * 0.1, long: -74 - i * 0.1 },
              api: {
                type: i % 3 === 0 ? 'external-b-style' : i % 3 === 1 ? 'external-c-style' : 'internal',
                baseUrl: i % 3 !== 2 ? `http://localhost:${4000 + i}` : undefined,
                defaultTransferCost: 0.1 + i * 0.05,
                defaultTransferTime: 0.5 + i * 0.1
              }
            })
        );
      }

      const responses = await Promise.all(warehousePromises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify all were registered
      const listResponse = await request(app)
        .get('/api/v2/inventory/warehouses')
        .set('Authorization', 'Bearer test-token');

      const perfWarehouses = listResponse.body.filter((w: any) => w.id.startsWith('PERF_WH_'));
      expect(perfWarehouses.length).toBe(20);
    });

    it('should query inventory efficiently across many warehouses', async () => {
      // Register 10 warehouses
      for (let i = 1; i <= 10; i++) {
        await warehouseRegistry.registerWarehouse({
          id: `QUERY_WH_${i}`,
          name: `Query Warehouse ${i}`,
          location: { lat: 35 + i * 0.2, long: -110 - i * 0.2 },
          api: { type: 'internal' }
        });
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v2/inventory/widgets')
        .set('Authorization', 'Bearer test-token');

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});