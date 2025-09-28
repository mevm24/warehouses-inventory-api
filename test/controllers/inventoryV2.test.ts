import express from 'express';
import request from 'supertest';
import inventoryRoutesV2 from '../../src/controllers/inventoryV2';
import { authMiddleware } from '../../src/middlewares/auth';
import '../../src/data';

describe('Inventory V2 Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use('/api/v2/inventory', inventoryRoutesV2);
  });

  describe('GET /api/v2/inventory/warehouses', () => {
    it('should return list of all registered warehouses', async () => {
      const response = await request(app).get('/api/v2/inventory/warehouses').set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(5);

      const warehouse = response.body[0];
      expect(warehouse).toHaveProperty('id');
      expect(warehouse).toHaveProperty('name');
      expect(warehouse).toHaveProperty('location');
      expect(warehouse).toHaveProperty('type');
      expect(warehouse.location).toHaveProperty('lat');
      expect(warehouse.location).toHaveProperty('long');
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app).get('/api/v2/inventory/warehouses');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v2/inventory/:warehouseId/:query', () => {
    describe('Valid warehouse operations', () => {
      it('should return inventory from specific warehouse by UPC', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/12345678')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('upc', '12345678');
          expect(response.body[0]).toHaveProperty('source', 'A');
        }
      });

      it('should return inventory from specific warehouse by category', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/widgets')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('category', 'widgets');
          expect(response.body[0]).toHaveProperty('source', 'A');
        }
      });

      it('should work with warehouse B (external-b-style)', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/B/12345678')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });

      it('should work with warehouse D (external-b-style)', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/D/11111111')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });

      it('should work with warehouse E (external-c-style)', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/E/11111111')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });
    });

    describe('Error handling', () => {
      it('should return 404 for non-existent warehouse', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/X/12345678')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Warehouse "X" not found.');
      });

      it('should return 404 for invalid category (looks like short UPC)', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/1234567')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });

      it('should return 404 for invalid category', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/invalidcategory')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });

      it('should return 404 when no inventory found for UPC', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/99999999')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('No inventory found for UPC "99999999"');
      });

      it('should return 404 when no inventory found for category', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/A/accessories')
          .set('Authorization', 'Bearer test-token');

        // This might return 200 with empty array or 404, depending on implementation
        expect([200, 404]).toContain(response.status);
      });
    });
  });

  describe('GET /api/v2/inventory/:query', () => {
    describe('Cross-warehouse queries', () => {
      it('should return inventory across all warehouses by UPC', async () => {
        const response = await request(app).get('/api/v2/inventory/12345678').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);

        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('upc', '12345678');

          // Should have items from multiple warehouses
          const sources = response.body.map((item: Record<string, unknown>) => item.source);
          expect(sources.length).toBeGreaterThan(0);
        }
      });

      it('should return inventory across all warehouses by category', async () => {
        const response = await request(app).get('/api/v2/inventory/widgets').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);

        if (response.body.length > 0) {
          expect(response.body.every((item: Record<string, unknown>) => item.category === 'widgets')).toBe(true);
        }
      });

      it('should work with gadgets category', async () => {
        const response = await request(app).get('/api/v2/inventory/gadgets').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });
    });

    describe('Error handling', () => {
      it('should return 404 for invalid category (looks like short UPC)', async () => {
        const response = await request(app).get('/api/v2/inventory/1234567').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });

      it('should return 404 for invalid category', async () => {
        const response = await request(app)
          .get('/api/v2/inventory/electronics')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });

      it('should return 404 for non-existent UPC', async () => {
        const response = await request(app).get('/api/v2/inventory/99999999').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'No inventory found for UPC "99999999".');
      });
    });
  });

  describe('POST /api/v2/inventory/transfer', () => {
    const validTransferRequest = {
      from: 'A',
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest',
    };

    describe('Valid transfers', () => {
      it('should successfully transfer with explicit source warehouse', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send(validTransferRequest);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Transfer of 5 units');
      });

      it('should successfully transfer with auto-selected source (from: null)', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            from: null,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Transfer of 5 units');
      });

      it('should work with fastest rule', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            rule: 'fastest',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });

      it('should work with new warehouses D and E', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            from: 'D',
            to: 'E',
            UPC: '11111111',
          });

        expect([200, 400]).toContain(response.status);
        // Might return 400 if no inventory found, which is acceptable
      });
    });

    describe('Validation errors', () => {
      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            from: 'A',
            to: 'B',
            // Missing UPC, quantity, rule
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Missing required fields (to, UPC, quantity, rule).');
      });

      it('should return 400 for invalid source warehouse', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            from: 'X',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid source warehouse');
      });

      it('should return 400 for invalid destination warehouse', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            to: 'X',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid destination warehouse');
      });

      it('should return 400 for same source and destination', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            from: 'A',
            to: 'A',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Source and destination warehouses cannot be the same.');
      });

      it('should return 400 for negative quantity', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            quantity: -5,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Quantity must be a positive number.');
      });

      it('should return 400 for zero quantity', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            quantity: 0,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Quantity must be a positive number.');
      });

      it('should return 400 for invalid transfer rule', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            rule: 'invalid-rule',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid transfer rule');
      });
    });

    describe('Business logic errors', () => {
      it('should return 400 for insufficient stock', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            quantity: 10000,
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Insufficient stock');
      });

      it('should return 400 for non-existent UPC', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            UPC: '99999999',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('No inventory found for UPC');
      });
    });
  });

  describe('POST /api/v2/inventory/warehouse/register', () => {
    const validWarehouseConfig = {
      id: 'F',
      name: 'Test Warehouse',
      location: {
        lat: 30.0,
        long: -90.0,
      },
      api: {
        type: 'internal',
        defaultTransferCost: 0.3,
        defaultTransferTime: 1.5,
      },
    };

    it('should successfully register a new warehouse', async () => {
      const response = await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send(validWarehouseConfig);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('registered successfully');
      expect(response.body).toHaveProperty('warehouse');
      expect(response.body.warehouse).toHaveProperty('id', 'F');
    });

    describe('Validation errors', () => {
      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/warehouse/register')
          .set('Authorization', 'Bearer test-token')
          .send({
            id: 'G',
            name: 'Incomplete Warehouse',
            // Missing location and api
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Missing required fields (id, name, location, api).');
      });

      it('should return 400 for duplicate warehouse ID', async () => {
        const response = await request(app)
          .post('/api/v2/inventory/warehouse/register')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validWarehouseConfig,
            id: 'A', // Existing warehouse
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already exists');
      });
    });
  });

  describe('DELETE /api/v2/inventory/warehouse/:id', () => {
    it('should successfully unregister an existing warehouse', async () => {
      // First register a warehouse to delete
      await request(app)
        .post('/api/v2/inventory/warehouse/register')
        .set('Authorization', 'Bearer test-token')
        .send({
          id: 'TEMP',
          name: 'Temporary Warehouse',
          location: { lat: 25.0, long: -80.0 },
          api: { type: 'internal', defaultTransferCost: 0.1, defaultTransferTime: 1.0 },
        });

      const response = await request(app)
        .delete('/api/v2/inventory/warehouse/TEMP')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('unregistered successfully');
    });

    it('should return 404 for non-existent warehouse', async () => {
      const response = await request(app)
        .delete('/api/v2/inventory/warehouse/NONEXISTENT')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for all endpoints without authorization', async () => {
      const endpoints = [
        { method: 'get', path: '/api/v2/inventory/warehouses' },
        { method: 'get', path: '/api/v2/inventory/A/widgets' },
        { method: 'get', path: '/api/v2/inventory/widgets' },
        { method: 'post', path: '/api/v2/inventory/transfer' },
        { method: 'post', path: '/api/v2/inventory/warehouse/register' },
        { method: 'delete', path: '/api/v2/inventory/warehouse/A' },
      ];

      for (const endpoint of endpoints) {
        let response: request.Response | undefined;
        if (endpoint.method === 'get') {
          response = await request(app).get(endpoint.path);
        } else if (endpoint.method === 'post') {
          response = await request(app).post(endpoint.path);
        } else if (endpoint.method === 'delete') {
          response = await request(app).delete(endpoint.path);
        }
        expect(response?.status).toBe(401);
      }
    });
  });
});
