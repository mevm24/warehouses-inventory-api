import express from 'express';
import request from 'supertest';
import inventoryRoutes from '../../src/controllers/inventory';
import { authMiddleware } from '../../src/middlewares/auth';
import '../../src/data';

describe('Inventory Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    app.use('/api/v1/inventory', inventoryRoutes);
  });

  describe('GET /api/v1/inventory/:query', () => {
    describe('UPC queries', () => {
      it('should return inventory for valid UPC', async () => {
        const response = await request(app).get('/api/v1/inventory/12345678').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('upc', '12345678');
      });

      it('should return 404 for non-existent UPC', async () => {
        const response = await request(app).get('/api/v1/inventory/99999999').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'No inventory found for UPC "99999999".');
      });

      it('should return 404 for invalid category that looks like short UPC', async () => {
        const response = await request(app).get('/api/v1/inventory/1234567').set('Authorization', 'Bearer test-token');

        // Since it's not 8+ digits, it's treated as a category name
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });
    });

    describe('Category queries', () => {
      it('should return inventory for valid category (widgets)', async () => {
        const response = await request(app).get('/api/v1/inventory/widgets').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('category', 'widgets');
      });

      it('should return inventory for valid category (gadgets)', async () => {
        const response = await request(app).get('/api/v1/inventory/gadgets').set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
      });

      it('should return 404 for invalid category', async () => {
        const response = await request(app)
          .get('/api/v1/inventory/electronics')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Invalid category.');
      });
    });

    describe('Authentication', () => {
      it('should return 401 without authorization header', async () => {
        const response = await request(app).get('/api/v1/inventory/widgets');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('POST /api/v1/inventory/transfer', () => {
    const validTransferRequest = {
      from: 'A',
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest',
    };

    it('should successfully transfer inventory with valid request', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send(validTransferRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Transfer of 5 units');
    });

    describe('Validation errors', () => {
      it('should return 400 for missing required fields', async () => {
        const response = await request(app)
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            from: 'A',
            to: 'B',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Missing required fields.');
      });

      it('should return 400 for invalid warehouse codes', async () => {
        const response = await request(app)
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            from: 'D',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid source or destination warehouse.');
      });

      it('should return 400 for same source and destination', async () => {
        const response = await request(app)
          .post('/api/v1/inventory/transfer')
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
          .post('/api/v1/inventory/transfer')
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
          .post('/api/v1/inventory/transfer')
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
          .post('/api/v1/inventory/transfer')
          .set('Authorization', 'Bearer test-token')
          .send({
            ...validTransferRequest,
            rule: 'invalid-rule',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Invalid transfer rule');
      });
    });

    it('should return 400 for insufficient stock', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          ...validTransferRequest,
          quantity: 1000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Insufficient stock');
    });

    it('should handle transfer with "fastest" rule', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/transfer')
        .set('Authorization', 'Bearer test-token')
        .send({
          ...validTransferRequest,
          rule: 'fastest',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
