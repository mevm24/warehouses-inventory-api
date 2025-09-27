import { ValidationServiceV2 } from '../../../src/services/validationServiceV2';
import { IWarehouseRegistryService } from '../../../src/services/warehouseRegistryService';
import { ValidationError } from '../../../src/errors/customErrors';
import { WarehouseConfig } from '../../../src/interfaces/warehouse';

describe('ValidationServiceV2', () => {
  let validationServiceV2: ValidationServiceV2;
  let mockWarehouseRegistry: jest.Mocked<IWarehouseRegistryService>;

  const mockWarehouses: WarehouseConfig[] = [
    {
      id: 'WH1',
      name: 'Warehouse 1',
      location: { lat: 40.7128, long: -74.0060 },
      api: { type: 'internal' }
    },
    {
      id: 'WH2',
      name: 'Warehouse 2',
      location: { lat: 34.0522, long: -118.2437 },
      api: { type: 'external-b-style', baseUrl: 'http://wh2.api' }
    }
  ];

  beforeEach(() => {
    mockWarehouseRegistry = {
      getAllWarehouses: jest.fn(),
      hasWarehouse: jest.fn(),
      registerWarehouse: jest.fn(),
      unregisterWarehouse: jest.fn(),
      getWarehouse: jest.fn(),
    };

    mockWarehouseRegistry.getAllWarehouses.mockReturnValue(mockWarehouses);

    validationServiceV2 = new ValidationServiceV2(mockWarehouseRegistry);
  });

  describe('validateTransferRequest', () => {
    const validRequest = {
      from: 'WH1',
      to: 'WH2',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest'
    };

    it('should validate a correct transfer request with source specified', () => {
      const result = validationServiceV2.validateTransferRequest(validRequest);

      expect(result).toEqual({
        from: 'WH1',
        to: 'WH2',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      });
    });

    it('should validate a correct transfer request without source (auto-select)', () => {
      const requestWithoutFrom = { ...validRequest, from: undefined };

      const result = validationServiceV2.validateTransferRequest(requestWithoutFrom);

      expect(result).toEqual({
        from: undefined,
        to: 'WH2',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      });
    });

    it('should throw ValidationError when to is missing', () => {
      const invalidRequest = { ...validRequest, to: undefined };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Missing required fields (to, UPC, quantity, rule).');
    });

    it('should throw ValidationError when UPC is missing', () => {
      const invalidRequest = { ...validRequest, UPC: undefined };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Missing required fields (to, UPC, quantity, rule).');
    });

    it('should throw ValidationError when quantity is undefined', () => {
      const invalidRequest = { ...validRequest, quantity: undefined };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Missing required fields (to, UPC, quantity, rule).');
    });

    it('should throw ValidationError when rule is missing', () => {
      const invalidRequest = { ...validRequest, rule: undefined };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Missing required fields (to, UPC, quantity, rule).');
    });

    it('should throw ValidationError for invalid source warehouse when provided', () => {
      const invalidRequest = { ...validRequest, from: 'INVALID' };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Invalid source warehouse. Valid options: WH1, WH2');
    });

    it('should throw ValidationError for invalid destination warehouse', () => {
      const invalidRequest = { ...validRequest, to: 'INVALID' };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Invalid destination warehouse. Valid options: WH1, WH2');
    });

    it('should throw ValidationError when source and destination are the same', () => {
      const invalidRequest = { ...validRequest, from: 'WH1', to: 'WH1' };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Source and destination warehouses cannot be the same.');
    });

    it('should throw ValidationError for zero quantity', () => {
      const invalidRequest = { ...validRequest, quantity: 0 };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Quantity must be a positive number.');
    });

    it('should throw ValidationError for negative quantity', () => {
      const invalidRequest = { ...validRequest, quantity: -5 };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Quantity must be a positive number.');
    });

    it('should throw ValidationError for invalid transfer rule', () => {
      const invalidRequest = { ...validRequest, rule: 'invalid_rule' };

      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(invalidRequest))
        .toThrow('Invalid transfer rule. Valid options: fastest, cheapest');
    });

    it('should accept fastest rule', () => {
      const validFastestRequest = { ...validRequest, rule: 'fastest' };

      const result = validationServiceV2.validateTransferRequest(validFastestRequest);
      expect(result.rule).toBe('fastest');
    });

    it('should accept cheapest rule', () => {
      const validCheapestRequest = { ...validRequest, rule: 'cheapest' };

      const result = validationServiceV2.validateTransferRequest(validCheapestRequest);
      expect(result.rule).toBe('cheapest');
    });
  });

  describe('validateWarehouseRegistration', () => {
    const validWarehouseConfig = {
      id: 'NEW_WH',
      name: 'New Warehouse',
      location: { lat: 45.5152, long: -122.6784 },
      api: { type: 'internal' as const }
    };

    beforeEach(() => {
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(false);
    });

    it('should validate a correct warehouse registration', () => {
      const result = validationServiceV2.validateWarehouseRegistration(validWarehouseConfig);

      expect(result).toEqual({
        id: 'NEW_WH',
        name: 'New Warehouse',
        location: { lat: 45.5152, long: -122.6784 },
        api: { type: 'internal' }
      });
    });

    it('should throw ValidationError when id is missing', () => {
      const invalidConfig = { ...validWarehouseConfig, id: undefined };

      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow('Missing required fields (id, name, location, api).');
    });

    it('should throw ValidationError when name is missing', () => {
      const invalidConfig = { ...validWarehouseConfig, name: undefined };

      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow('Missing required fields (id, name, location, api).');
    });

    it('should throw ValidationError when location is missing', () => {
      const invalidConfig = { ...validWarehouseConfig, location: undefined };

      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow('Missing required fields (id, name, location, api).');
    });

    it('should throw ValidationError when api is missing', () => {
      const invalidConfig = { ...validWarehouseConfig, api: undefined };

      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateWarehouseRegistration(invalidConfig))
        .toThrow('Missing required fields (id, name, location, api).');
    });

    it('should throw ValidationError when warehouse ID already exists', () => {
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);

      expect(() => validationServiceV2.validateWarehouseRegistration(validWarehouseConfig))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateWarehouseRegistration(validWarehouseConfig))
        .toThrow('Warehouse with ID "NEW_WH" already exists.');
    });

    it('should call warehouse registry to check for existing warehouse', () => {
      validationServiceV2.validateWarehouseRegistration(validWarehouseConfig);

      expect(mockWarehouseRegistry.hasWarehouse).toHaveBeenCalledWith('NEW_WH');
    });
  });

  describe('dynamic warehouse validation', () => {
    it('should update validation when warehouses are added', () => {
      const newWarehouse: WarehouseConfig = {
        id: 'WH3',
        name: 'Warehouse 3',
        location: { lat: 41.8781, long: -87.6298 },
        api: { type: 'external-c-style', baseUrl: 'http://wh3.api' }
      };

      // Add new warehouse to mock registry
      const updatedWarehouses = [...mockWarehouses, newWarehouse];
      mockWarehouseRegistry.getAllWarehouses.mockReturnValue(updatedWarehouses);

      const requestWithNewWarehouse = {
        from: 'WH1',
        to: 'WH3', // Using the new warehouse
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      };

      const result = validationServiceV2.validateTransferRequest(requestWithNewWarehouse);
      expect(result.to).toBe('WH3');
    });

    it('should reject requests to warehouses that have been removed', () => {
      // Remove WH2 from mock registry
      const reducedWarehouses = [mockWarehouses[0]]; // Only WH1
      mockWarehouseRegistry.getAllWarehouses.mockReturnValue(reducedWarehouses);

      const requestToRemovedWarehouse = {
        from: 'WH1',
        to: 'WH2', // WH2 no longer exists
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      };

      expect(() => validationServiceV2.validateTransferRequest(requestToRemovedWarehouse))
        .toThrow(ValidationError);
      expect(() => validationServiceV2.validateTransferRequest(requestToRemovedWarehouse))
        .toThrow('Invalid destination warehouse. Valid options: WH1');
    });
  });
});