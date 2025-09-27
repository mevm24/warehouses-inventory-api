// --- Express Router for Inventory Endpoints ---
import { type Request, type Response, Router } from 'express';
import { Container } from '../container/container';
import { handleError, handleTransferError } from '../errors/customErrors';
import type { IInventoryService, ITransferService, IValidationService, NormalizedInventoryItem } from '../interfaces';
import {
  createCategoryNotFoundError,
  createUPCNotFoundError,
  validateAndClassifyQuery,
  validateResultNotEmpty,
} from '../utils/queryUtils';

const router = Router();
const container = Container.getInstance();
const transferService: ITransferService = container.getTransferService();
const validationService: IValidationService = container.getValidationService();
const inventoryService: IInventoryService = container.getInventoryService();

// GET /api/v1/inventory/{query} - Get inventory by UPC or category
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const { type, value } = validateAndClassifyQuery(query);

    let allItems: NormalizedInventoryItem[];
    if (type === 'upc') {
      allItems = await inventoryService.getAllInventory(value);
      validateResultNotEmpty(allItems, createUPCNotFoundError(value));
    } else {
      allItems = await inventoryService.getAllInventory(undefined, value);
      validateResultNotEmpty(allItems, createCategoryNotFoundError(value));
    }

    res.json(allItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return handleError(error, res, 'Failed to retrieve inventory.');
  }
});

// POST /api/v1/inventory/transfer - Transfer inventory between warehouses
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validationService.validateTransferRequest(req.body);
    const message = await transferService.performTransfer(transferRequest);
    res.json({ message });
  } catch (error) {
    console.error('Error during inventory transfer:', error);
    return handleTransferError(error, res);
  }
});

export default router;
