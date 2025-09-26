import { TransferRequestV2 } from '../interfaces/general';
import { WarehouseConfig } from '../interfaces/warehouse';
import { ValidationError } from '../errors/customErrors';
import { IWarehouseRegistryService } from './warehouseRegistryService';

export interface IValidationServiceV2 {
  validateTransferRequest(body: any): TransferRequestV2;
  validateWarehouseRegistration(body: any): WarehouseConfig;
}

export class ValidationServiceV2 implements IValidationServiceV2 {
  private readonly validRules = ['fastest', 'cheapest'];

  constructor(private warehouseRegistryService: IWarehouseRegistryService) {}

  validateTransferRequest(body: any): TransferRequestV2 {
    const { from, to, UPC, quantity, rule } = body;
    const warehouses = this.warehouseRegistryService.getAllWarehouses();
    const validWarehouseIds = warehouses.map(w => w.id);

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

    if (!this.validRules.includes(rule)) {
      throw new ValidationError(`Invalid transfer rule. Valid options: ${this.validRules.join(', ')}`);
    }

    return { from, to, UPC, quantity, rule };
  }

  validateWarehouseRegistration(body: any): WarehouseConfig {
    const { id, name, location, api } = body;

    // Validate required fields
    if (!id || !name || !location || !api) {
      throw new ValidationError('Missing required fields (id, name, location, api).');
    }

    if (this.warehouseRegistryService.hasWarehouse(id)) {
      throw new ValidationError(`Warehouse with ID "${id}" already exists.`);
    }

    return { id, name, location, api };
  }
}