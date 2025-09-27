import express, { type NextFunction, type Request, type Response } from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config'; // For environment variables
import { warehouseRegistry } from './config/registry'; // Import singleton registry
import { PORT } from './constants';
import inventoryRoutes from './controllers/inventory';
import inventoryRoutesV2 from './controllers/inventoryV2';
import { authMiddleware } from './middlewares/auth';
import { swaggerSpec } from './swagger';
import './data/index'; // Initialize mock data and APIs

// Re-export for controllers that import from index
export { warehouseRegistry };

const app = express();

// Middleware
app.use(express.json());
app.use(morgan('dev')); // Logging

// Public routes (no auth required)
app.get('/', (_req: Request, res: Response) => {
  res.send('Inventory API is running. Visit <a href="/docs">/docs</a> for API documentation.');
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply auth middleware to API routes only
app.use('/api', authMiddleware);

// API Routes (protected by auth)
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v2/inventory', inventoryRoutesV2);

// Generic Error Handling Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Server Initialization
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Available API endpoints:');
  console.log('  V1: /api/v1/inventory/* (3 warehouses: A, B, C)');
  console.log('  V2: /api/v2/inventory/* (N warehouses: A, B, C, D, E + dynamic)');
});
