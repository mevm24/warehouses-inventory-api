// --- Refactored Express Router for N Warehouses ---
import { Router, Request, Response } from 'express';
import { Container } from '../container/container';
import { ITransferServiceV2 } from '../services/transferServiceV2';
import { IWarehouseRegistryService } from '../services/warehouseRegistryService';
import { IValidationServiceV2 } from '../services/validationServiceV2';
import { IQueryServiceV2 } from '../services/queryServiceV2';
import { ValidationError, NotFoundError } from '../errors/customErrors';

const router = Router();
const container = Container.getInstance();
const transferServiceV2: ITransferServiceV2 = container.getTransferServiceV2();
const warehouseRegistryService: IWarehouseRegistryService = container.getWarehouseRegistryService();
const validationServiceV2: IValidationServiceV2 = container.getValidationServiceV2();
const queryServiceV2: IQueryServiceV2 = container.getQueryServiceV2();

/**
 * @api {get} /warehouses Get list of all registered warehouses
 */
router.get('/warehouses', async (req: Request, res: Response) => {
  try {
    const warehouses = warehouseRegistryService.getAllWarehouses();
    res.json(warehouses.map(w => ({
      id: w.id,
      name: w.name,
      location: w.location,
      type: w.api.type
    })));
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ message: 'Failed to retrieve warehouses.' });
  }
});

/**
 * @api {get} /:warehouseId/:query Get inventory from specific warehouse
 */
router.get('/:warehouseId/:query', async (req: Request, res: Response) => {
  const { warehouseId, query } = req.params;

  try {
    const items = await queryServiceV2.getInventoryFromWarehouseByQuery(warehouseId, query);
    res.json(items);
  } catch (error) {
    console.error('Error fetching warehouse inventory:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to retrieve inventory.' });
  }
});


/**
 * @api {get} /:query Get inventory across all warehouses
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const allItems = await queryServiceV2.getInventoryByQuery(query);
    res.json(allItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to retrieve inventory.' });
  }
});


/**
 * @api {post} /transfer Transfer inventory between warehouses
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validationServiceV2.validateTransferRequest(req.body);

    let message: string;
    if (transferRequest.from) {
      // Specific source warehouse provided
      message = await transferServiceV2.performTransfer(transferRequest);
    } else {
      // Auto-select optimal source warehouse
      message = await transferServiceV2.performOptimalTransferV2(transferRequest);
    }

    res.json({ message });
  } catch (error) {
    console.error('Error during inventory transfer:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to process transfer.'
    });
  }
});


/**
 * @api {post} /warehouse/register Register a new warehouse
 */
router.post('/warehouse/register', async (req: Request, res: Response) => {
  try {
    const warehouseConfig = validationServiceV2.validateWarehouseRegistration(req.body);
    warehouseRegistryService.registerWarehouse(warehouseConfig);

    res.status(200).json({
      message: `Warehouse "${warehouseConfig.id}" registered successfully.`,
      warehouse: {
        id: warehouseConfig.id,
        name: warehouseConfig.name,
        location: warehouseConfig.location,
        type: warehouseConfig.api.type
      }
    });
  } catch (error) {
    console.error('Error registering warehouse:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to register warehouse.' });
  }
});


/**
 * @api {delete} /warehouse/:id Unregister an existing warehouse
 */
router.delete('/warehouse/:id', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.params.id;

    if (!warehouseRegistryService.hasWarehouse(warehouseId)) {
      return res.status(404).json({ message: `Warehouse "${warehouseId}" not found.` });
    }

    const removed = warehouseRegistryService.unregisterWarehouse(warehouseId);

    if (removed) {
      res.json({ message: `Warehouse "${warehouseId}" unregistered successfully.` });
    } else {
      res.status(500).json({ message: 'Failed to unregister warehouse.' });
    }
  } catch (error) {
    console.error('Error unregistering warehouse:', error);
    res.status(500).json({ message: 'Failed to unregister warehouse.' });
  }
});

export default router;