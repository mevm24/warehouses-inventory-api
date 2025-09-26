// --- Express Router for Inventory Endpoints ---
import { Router, Request, Response } from 'express';
import { Container } from '../container/container';
import { ITransferService } from '../interfaces/services';
import { IValidationService } from '../services/validationService';
import { IQueryService } from '../services/queryService';
import { ValidationError, NotFoundError } from '../errors/customErrors';

const router = Router();
const container = Container.getInstance();
const transferService: ITransferService = container.getTransferService();
const validationService: IValidationService = container.getValidationService();
const queryService: IQueryService = container.getQueryService();

/**
 * @api {get} /:query Get inventory by UPC or category
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;

  try {
    const allItems = await queryService.getInventoryByQuery(query);
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
 * @api {post} /transfer Transfer inventory
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const transferRequest = validationService.validateTransferRequest(req.body);
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


export default router;
