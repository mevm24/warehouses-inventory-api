import { ValidationError } from '../../../src/errors/customErrors';
import { ValidationService } from '../../../src/services/validationService';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateTransferRequest', () => {
    const validRequest = {
      from: 'A',
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest',
    };

    it('should validate a correct transfer request', () => {
      const result = validationService.validateTransferRequest(validRequest);

      expect(result).toEqual({
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest',
      });
    });

    it('should throw ValidationError when from is missing', () => {
      const invalidRequest = { ...validRequest, from: undefined };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow('Missing required fields.');
    });

    it('should throw ValidationError when to is missing', () => {
      const invalidRequest = { ...validRequest, to: undefined };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow('Missing required fields.');
    });

    it('should throw ValidationError when UPC is missing', () => {
      const invalidRequest = { ...validRequest, UPC: undefined };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow('Missing required fields.');
    });

    it('should throw ValidationError when quantity is undefined', () => {
      const invalidRequest = { ...validRequest, quantity: undefined };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow('Missing required fields.');
    });

    it('should throw ValidationError when rule is missing', () => {
      const invalidRequest = { ...validRequest, rule: undefined };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow('Missing required fields.');
    });

    it('should throw ValidationError for invalid source warehouse', () => {
      const invalidRequest = { ...validRequest, from: 'INVALID' };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Invalid source or destination warehouse.'
      );
    });

    it('should throw ValidationError for invalid destination warehouse', () => {
      const invalidRequest = { ...validRequest, to: 'INVALID' };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Invalid source or destination warehouse.'
      );
    });

    it('should throw ValidationError when source and destination are the same', () => {
      const invalidRequest = { ...validRequest, from: 'A', to: 'A' };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Source and destination warehouses cannot be the same.'
      );
    });

    it('should throw ValidationError for zero quantity', () => {
      const invalidRequest = { ...validRequest, quantity: 0 };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Quantity must be a positive number.'
      );
    });

    it('should throw ValidationError for negative quantity', () => {
      const invalidRequest = { ...validRequest, quantity: -5 };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Quantity must be a positive number.'
      );
    });

    it('should throw ValidationError for invalid transfer rule', () => {
      const invalidRequest = { ...validRequest, rule: 'invalid_rule' };

      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(ValidationError);
      expect(() => validationService.validateTransferRequest(invalidRequest)).toThrow(
        'Invalid transfer rule. Must be one of: fastest, cheapest.'
      );
    });

    it('should accept fastest rule', () => {
      const validFastestRequest = { ...validRequest, rule: 'fastest' };

      const result = validationService.validateTransferRequest(validFastestRequest);
      expect(result.rule).toBe('fastest');
    });

    it('should accept cheapest rule', () => {
      const validCheapestRequest = { ...validRequest, rule: 'cheapest' };

      const result = validationService.validateTransferRequest(validCheapestRequest);
      expect(result.rule).toBe('cheapest');
    });

    it('should accept all valid warehouses A, B, C', () => {
      const warehouseTests = [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'A' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'C', to: 'B' },
      ];

      warehouseTests.forEach(({ from, to }) => {
        const request = { ...validRequest, from, to };
        const result = validationService.validateTransferRequest(request);
        expect(result.from).toBe(from);
        expect(result.to).toBe(to);
      });
    });
  });
});
