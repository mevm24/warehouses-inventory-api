import { ValidationError } from '../errors/customErrors';
import type { IValidationService, TransferRequest, TransferRequestBody } from '../interfaces';

export class ValidationService implements IValidationService {
  private readonly validWarehouses = ['A', 'B', 'C'];
  private readonly validRules = ['fastest', 'cheapest'];

  validateTransferRequest(body: TransferRequestBody): TransferRequest {
    const { from, to, UPC, quantity, rule } = body;

    if (!from || !to || !UPC || quantity === undefined || !rule) {
      throw new ValidationError('Missing required fields.');
    }

    if (!this.validWarehouses.includes(from) || !this.validWarehouses.includes(to)) {
      throw new ValidationError('Invalid source or destination warehouse.');
    }

    if (from === to) {
      throw new ValidationError('Source and destination warehouses cannot be the same.');
    }

    if (quantity <= 0) {
      throw new ValidationError('Quantity must be a positive number.');
    }

    if (!this.validRules.includes(rule)) {
      throw new ValidationError(`Invalid transfer rule. Must be one of: ${this.validRules.join(', ')}.`);
    }

    return {
      from: from as 'A' | 'B' | 'C' | undefined,
      to: to as 'A' | 'B' | 'C' | undefined,
      UPC,
      quantity,
      rule: rule as 'fastest' | 'cheapest',
    };
  }
}
