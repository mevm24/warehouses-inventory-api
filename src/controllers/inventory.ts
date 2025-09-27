// --- Express Router for Inventory Endpoints ---
import { Router, Request, Response } from 'express';
import { Container } from '../container/container';
import { ITransferService, IInventoryService } from '../interfaces/services';
import { IValidationService } from '../services/validationService';
import { ErrorHandler } from '../errors/customErrors';
import { QueryUtils } from '../utils/queryUtils';

const router = Router();
const container = Container.getInstance();
const transferService: ITransferService = container.getTransferService();
const validationService: IValidationService = container.getValidationService();
const inventoryService: IInventoryService = container.getInventoryService();

/**
 * @api {get} /:query Get inventory by UPC or category
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const { type, value } = QueryUtils.validateAndClassifyQuery(query);

    let allItems;
    if (type === 'upc') {
      allItems = await inventoryService.getAllInventory(value);
      QueryUtils.validateResultNotEmpty(allItems, QueryUtils.createUPCNotFoundError(value));
    } else {
      allItems = await inventoryService.getAllInventory(undefined, value);
      QueryUtils.validateResultNotEmpty(allItems, QueryUtils.createCategoryNotFoundError(value));
    }

    res.json(allItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return ErrorHandler.handleError(error, res, 'Failed to retrieve inventory.');
  }
});


/**
 * @api {post} /transfer Transfer inventory
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validationService.validateTransferRequest(req.body);
    const message = await transferService.performTransfer(transferRequest);
    res.json({ message });
  } catch (error) {
    console.error('Error during inventory transfer:', error);
    return ErrorHandler.handleTransferError(error, res);
  }
});


export default router;
