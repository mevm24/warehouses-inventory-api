// --- Refactored Express Router for N Warehouses ---
import { Router, Request, Response } from 'express';
import { Container } from '../container/container';
import { ITransferServiceV2 } from '../services/transferServiceV2';
import { IWarehouseRegistryService } from '../services/warehouseRegistryService';
import { IValidationServiceV2 } from '../services/validationServiceV2';
import { IInventoryServiceV2 } from '../services/inventoryServiceV2';
import { ErrorHandler } from '../errors/customErrors';
import { QueryUtils } from '../utils/queryUtils';
import { NotFoundError } from '../errors/customErrors';

const router = Router();
const container = Container.getInstance();
const transferServiceV2: ITransferServiceV2 = container.getTransferServiceV2();
const warehouseRegistryService: IWarehouseRegistryService = container.getWarehouseRegistryService();
const validationServiceV2: IValidationServiceV2 = container.getValidationServiceV2();
const inventoryServiceV2: IInventoryServiceV2 = container.getInventoryServiceV2();

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
    // Validate warehouse exists
    if (!warehouseRegistryService.hasWarehouse(warehouseId)) {
      throw new NotFoundError(`Warehouse "${warehouseId}" not found.`);
    }

    const { type, value } = QueryUtils.validateAndClassifyQuery(query);

    let items;
    if (type === 'upc') {
      items = await inventoryServiceV2.getInventoryFromWarehouse(warehouseId, value);
      QueryUtils.validateResultNotEmpty(items, QueryUtils.createUPCNotFoundError(value, warehouseId));
    } else {
      items = await inventoryServiceV2.getInventoryFromWarehouse(warehouseId, undefined, value);
      QueryUtils.validateResultNotEmpty(items, QueryUtils.createCategoryNotFoundError(value, warehouseId));
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching warehouse inventory:', error);
    return ErrorHandler.handleError(error, res, 'Failed to retrieve inventory.');
  }
});


/**
 * @api {get} /:query Get inventory across all warehouses
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const { type, value } = QueryUtils.validateAndClassifyQuery(query);

    let allItems;
    if (type === 'upc') {
      allItems = await inventoryServiceV2.getAllInventory(value);
      QueryUtils.validateResultNotEmpty(allItems, QueryUtils.createUPCNotFoundError(value));
    } else {
      allItems = await inventoryServiceV2.getAllInventory(undefined, value);
      QueryUtils.validateResultNotEmpty(allItems, QueryUtils.createCategoryNotFoundError(value));
    }

    res.json(allItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return ErrorHandler.handleError(error, res, 'Failed to retrieve inventory.');
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
    return ErrorHandler.handleTransferError(error, res);
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
    return ErrorHandler.handleError(error, res, 'Failed to register warehouse.');
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