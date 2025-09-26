// --- Express Router for Inventory Endpoints ---
import { Router, Request, Response } from 'express';
import { TransferRequest } from '../interfaces/general';
import { Container } from '../container/container';
import { IInventoryService, ITransferService } from '../interfaces/services';

const router = Router();
const container = Container.getInstance();
const inventoryService: IInventoryService = container.getInventoryService();
const transferService: ITransferService = container.getTransferService();

/**
 * @api {get} /:query Get inventory by UPC or category
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const allItems = await getInventoryByQuery(query);
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

async function getInventoryByQuery(query: string) {
  const isUPC = /^\d{8,}$/.test(query);

  if (isUPC) {
    return await getInventoryByUPC(query);
  } else {
    return await getInventoryByCategory(query);
  }
}

async function getInventoryByUPC(upc: string) {
  if (upc.length < 8) {
    throw new ValidationError('Invalid UPC code.');
  }

  const items = await inventoryService.getAllInventory(upc);
  if (items.length === 0) {
    throw new NotFoundError(`No inventory found for UPC "${upc}".`);
  }

  return items;
}

async function getInventoryByCategory(category: string) {
  const normalizedCategory = category.toLowerCase();
  const validCategories = ['widgets', 'gadgets', 'accessories'];

  if (!validCategories.includes(normalizedCategory)) {
    throw new NotFoundError('Invalid category.');
  }

  const items = await inventoryService.getAllInventory(undefined, normalizedCategory);
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
 * @api {post} /transfer Transfer inventory
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validateTransferRequest(req.body);
    const message = await transferService.performTransfer(transferRequest);
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

function validateTransferRequest(body: any): TransferRequest {
  const { from, to, UPC, quantity, rule } = body;
  const validWarehouses = ['A', 'B', 'C'];
  const validRules = ['fastest', 'cheapest'];

  if (!from || !to || !UPC || quantity === undefined || !rule) {
    throw new ValidationError('Missing required fields.');
  }

  if (!validWarehouses.includes(from) || !validWarehouses.includes(to)) {
    throw new ValidationError('Invalid source or destination warehouse.');
  }

  if (from === to) {
    throw new ValidationError('Source and destination warehouses cannot be the same.');
  }

  if (quantity <= 0) {
    throw new ValidationError('Quantity must be a positive number.');
  }

  if (!validRules.includes(rule)) {
    throw new ValidationError(`Invalid transfer rule. Must be one of: ${validRules.join(', ')}.`);
  }

  return { from, to, UPC, quantity, rule };
}

export default router;
