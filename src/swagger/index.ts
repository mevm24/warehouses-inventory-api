import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

// Option 1: Load from YAML file (cleanest approach)
const loadSwaggerFromYaml = () => {
  try {
    const yamlPath = path.join(__dirname, '../../docs/api-spec.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    return yaml.load(yamlContent);
  } catch (_error) {
    console.warn('Could not load YAML spec, falling back to inline definition');
    return null;
  }
};

// Option 2: Clean inline definition (much simpler than JSDoc comments)
const inlineSwaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Warehouses Inventory Management API',
    version: '1.0.0',
    description: 'Modern warehouse inventory management with smart transfer optimization',
  },
  servers: [{ url: 'http://localhost:3000' }],
  security: [{ BearerAuth: [] }],

  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer' },
    },
    schemas: {
      TransferRequest: {
        type: 'object',
        required: ['from', 'to', 'UPC', 'quantity', 'rule'],
        properties: {
          from: { type: 'string', enum: ['A', 'B', 'C'], example: 'A' },
          to: { type: 'string', enum: ['A', 'B', 'C'], example: 'B' },
          UPC: { type: 'string', pattern: '^\\d{8,12}$', example: '12345678' },
          quantity: { type: 'integer', minimum: 1, example: 5 },
          rule: { type: 'string', enum: ['cheapest', 'fastest'], example: 'cheapest' },
        },
      },
      InventoryItem: {
        type: 'object',
        properties: {
          source: { type: 'string', example: 'A' },
          upc: { type: 'string', example: '12345678' },
          category: { type: 'string', example: 'widgets' },
          name: { type: 'string', example: 'Test Widget' },
          quantity: { type: 'integer', example: 15 },
          transferCost: { type: 'number', example: 0.3 },
          transferTime: { type: 'number', example: 2 },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Invalid UPC format' } },
      },
      Success: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Transfer completed successfully' } },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      BadRequest: {
        description: 'Bad request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },

  paths: {
    '/api/v1/inventory/{query}': {
      get: {
        summary: 'Get inventory by UPC or category',
        tags: ['V1 - Inventory'],
        parameters: [
          {
            name: 'query',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/inventory/transfer': {
      post: {
        summary: 'Transfer inventory between warehouses',
        tags: ['V1 - Transfers'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRequest' } } },
        },
        responses: {
          '200': {
            description: 'Transfer completed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/v2/inventory/warehouses': {
      get: {
        summary: 'Get all registered warehouses',
        tags: ['V2 - Warehouse Management'],
        responses: {
          '200': {
            description: 'List of warehouses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'A' },
                      name: { type: 'string', example: 'Internal Warehouse' },
                      location: {
                        type: 'object',
                        properties: {
                          lat: { type: 'number', example: 40.7128 },
                          long: { type: 'number', example: -74.006 },
                        },
                      },
                      type: { type: 'string', example: 'internal' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v2/inventory/{warehouseId}/{query}': {
      get: {
        summary: 'Get inventory from specific warehouse by UPC or category',
        tags: ['V2 - Inventory Management'],
        parameters: [
          {
            name: 'warehouseId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'A',
          },
          {
            name: 'query',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v2/inventory/{query}': {
      get: {
        summary: 'Get inventory across all warehouses by UPC or category',
        tags: ['V2 - Inventory Management'],
        parameters: [
          {
            name: 'query',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: '12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v2/inventory/transfer': {
      post: {
        summary: 'Transfer inventory between warehouses with advanced features',
        tags: ['V2 - Transfers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to', 'UPC', 'quantity', 'rule'],
                properties: {
                  from: { type: 'string', example: 'A' },
                  to: { type: 'string', example: 'B' },
                  UPC: { type: 'string', pattern: '^\\d{8,12}$', example: '12345678' },
                  quantity: { type: 'integer', minimum: 1, example: 5 },
                  rule: { type: 'string', enum: ['cheapest', 'fastest'], example: 'cheapest' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Transfer completed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v2/inventory/warehouse/register': {
      post: {
        summary: 'Register a new warehouse',
        tags: ['V2 - Warehouse Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'name', 'location', 'api'],
                properties: {
                  id: { type: 'string', example: 'F' },
                  name: { type: 'string', example: 'New Distribution Center' },
                  location: {
                    type: 'object',
                    required: ['lat', 'long'],
                    properties: {
                      lat: { type: 'number', example: 40.7128 },
                      long: { type: 'number', example: -74.006 },
                    },
                  },
                  api: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                      type: { type: 'string', enum: ['internal', 'external', 'mock'], example: 'external' },
                      baseUrl: { type: 'string', example: 'https://api.warehouse-f.com' },
                      apiKey: { type: 'string', example: 'key-12345' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Warehouse registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Warehouse "F" registered successfully.' },
                    warehouse: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'F' },
                        name: { type: 'string', example: 'New Distribution Center' },
                        location: {
                          type: 'object',
                          properties: {
                            lat: { type: 'number', example: 40.7128 },
                            long: { type: 'number', example: -74.006 },
                          },
                        },
                        type: { type: 'string', example: 'external' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/v2/inventory/warehouse/{id}': {
      delete: {
        summary: 'Unregister an existing warehouse',
        tags: ['V2 - Warehouse Management'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'F',
          },
        ],
        responses: {
          '200': {
            description: 'Warehouse unregistered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Warehouse "F" unregistered successfully.' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Warehouse not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Warehouse "F" not found.' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

// Try YAML first, fallback to inline
export const swaggerSpec = loadSwaggerFromYaml() || inlineSwaggerSpec;
