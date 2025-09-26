// --- Refactored Express Router for N Warehouses ---
import { Router, Request, Response } from 'express';
import { TransferRequestV2 } from '../interfaces/general';
import { Container } from '../container/container';
import { IInventoryServiceV2 } from '../services/inventoryServiceV2';
import { ITransferServiceV2 } from '../services/transferServiceV2';
import { IWarehouseRegistryService } from '../services/warehouseRegistryService';

const router = Router();
const container = Container.getInstance();
const inventoryServiceV2: IInventoryServiceV2 = container.getInventoryServiceV2();
const transferServiceV2: ITransferServiceV2 = container.getTransferServiceV2();
const warehouseRegistryService: IWarehouseRegistryService = container.getWarehouseRegistryService();

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
    const items = await getInventoryFromWarehouseByQuery(warehouseId, query);
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

async function getInventoryFromWarehouseByQuery(warehouseId: string, query: string) {
  // Validate warehouse exists
  if (!warehouseRegistryService.hasWarehouse(warehouseId)) {
    throw new NotFoundError(`Warehouse "${warehouseId}" not found.`);
  }

  const isUPC = /^\d{8,}$/.test(query);

  if (isUPC) {
    // It's a UPC
    if (query.length < 8) {
      throw new ValidationError('Invalid UPC code.');
    }
    const items = await inventoryServiceV2.getInventoryFromWarehouse(warehouseId, query);

    if (items.length === 0) {
      throw new NotFoundError(`No inventory found for UPC "${query}" in warehouse ${warehouseId}.`);
    }

    return items;
  } else {
    // It's a category
    const category = query.toLowerCase();
    if (!['widgets', 'gadgets', 'accessories'].includes(category)) {
      throw new NotFoundError('Invalid category.');
    }

    const items = await inventoryServiceV2.getInventoryFromWarehouse(warehouseId, undefined, category);

    if (items.length === 0) {
      throw new NotFoundError(`No items found in category "${category}" for warehouse ${warehouseId}.`);
    }

    return items;
  }
}

/**
 * @api {get} /:query Get inventory across all warehouses
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const allItems = await getInventoryByQueryV2(query);
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

async function getInventoryByQueryV2(query: string) {
  const isUPC = /^\d{8,}$/.test(query);

  if (isUPC) {
    return await getInventoryByUPCV2(query);
  } else {
    return await getInventoryByCategoryV2(query);
  }
}

async function getInventoryByUPCV2(upc: string) {
  if (upc.length < 8) {
    throw new ValidationError('Invalid UPC code.');
  }

  const items = await inventoryServiceV2.getAllInventory(upc);
  if (items.length === 0) {
    throw new NotFoundError(`No inventory found for UPC "${upc}".`);
  }

  return items;
}

async function getInventoryByCategoryV2(category: string) {
  const normalizedCategory = category.toLowerCase();
  const validCategories = ['widgets', 'gadgets', 'accessories'];

  if (!validCategories.includes(normalizedCategory)) {
    throw new NotFoundError('Invalid category.');
  }

  const items = await inventoryServiceV2.getAllInventory(undefined, normalizedCategory);
  if (items.length === 0) {
    throw new NotFoundError(`No items found in category "${normalizedCategory}".`);
  }

  return items;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * @api {post} /transfer Transfer inventory between warehouses
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validateTransferRequestV2(req.body);

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

function validateTransferRequestV2(body: any): TransferRequestV2 {
  const { from, to, UPC, quantity, rule } = body;
  const warehouses = warehouseRegistryService.getAllWarehouses();
  const validWarehouseIds = warehouses.map(w => w.id);
  const validRules = ['fastest', 'cheapest'];

  // Data Validation
  if (!to || !UPC || quantity === undefined || !rule) {
    throw new ValidationError('Missing required fields (to, UPC, quantity, rule).');
  }

  // From is optional - if not provided, system will auto-select
  if (from && !validWarehouseIds.includes(from)) {
    throw new ValidationError(`Invalid source warehouse. Valid options: ${validWarehouseIds.join(', ')}`);
  }

  if (!validWarehouseIds.includes(to)) {
    throw new ValidationError(`Invalid destination warehouse. Valid options: ${validWarehouseIds.join(', ')}`);
  }

  if (from && from === to) {
    throw new ValidationError('Source and destination warehouses cannot be the same.');
  }

  if (quantity <= 0) {
    throw new ValidationError('Quantity must be a positive number.');
  }

  if (!validRules.includes(rule)) {
    throw new ValidationError(`Invalid transfer rule. Valid options: ${validRules.join(', ')}`);
  }

  return { from, to, UPC, quantity, rule };
}

/**
 * @api {post} /warehouse/register Register a new warehouse
 */
router.post('/warehouse/register', async (req: Request, res: Response) => {
  try {
    const warehouseConfig = validateWarehouseRegistration(req.body);
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

function validateWarehouseRegistration(body: any) {
  const { id, name, location, api } = body;

  // Validate required fields
  if (!id || !name || !location || !api) {
    throw new ValidationError('Missing required fields (id, name, location, api).');
  }

  if (warehouseRegistryService.hasWarehouse(id)) {
    throw new ValidationError(`Warehouse with ID "${id}" already exists.`);
  }

  return { id, name, location, api };
}

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