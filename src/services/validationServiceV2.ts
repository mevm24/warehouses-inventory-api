import { ValidationError } from '../errors/customErrors';
import type {
  IValidationServiceV2,
  IWarehouseRegistryService,
  TransferRequestBodyV2,
  TransferRequestV2,
  WarehouseApiConfig,
  WarehouseConfig,
  WarehouseRegistrationBody,
} from '../interfaces';

export class ValidationServiceV2 implements IValidationServiceV2 {
  private readonly validRules = ['fastest', 'cheapest'];

  constructor(private warehouseRegistryService: IWarehouseRegistryService) {}

  validateTransferRequest(body: TransferRequestBodyV2): TransferRequestV2 {
    const { from, to, UPC, quantity, rule } = body;
    const warehouses = this.warehouseRegistryService.getAllWarehouses();
    const validWarehouseIds = warehouses.map((w) => w.id);

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

    return {
      from,
      to,
      UPC,
      quantity,
      rule: rule as 'fastest' | 'cheapest',
    };
  }

  validateWarehouseRegistration(body: WarehouseRegistrationBody): WarehouseConfig {
    const { id, name, location, api } = body;

    // Validate required fields
    if (!id || !name || !location || !api) {
      throw new ValidationError('Missing required fields (id, name, location, api).');
    }

    if (this.warehouseRegistryService.hasWarehouse(id)) {
      throw new ValidationError(`Warehouse with ID "${id}" already exists.`);
    }

    return {
      id,
      name,
      location: location as { lat: number; long: number },
      api: api as WarehouseApiConfig,
    };
  }
}
