import { PORT } from '../constants';

export const swaggerOptions = {
  swaggerDefinition: {
    openapi: '2.0',
    info: {
      title: 'Ecommerce Inventory API',
      version: '1.0.0',
      description: 'API documentation using Swagger',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ['./src/controllers/*.ts'], // Path to your API route files
};
