import { QueryUtils } from '../../src/utils/queryUtils';
import { ValidationError, NotFoundError } from '../../src/errors/customErrors';

describe('QueryUtils', () => {
  describe('validateAndClassifyQuery', () => {
    describe('UPC classification', () => {
      it('should classify valid 8-digit UPC as UPC', () => {
        const result = QueryUtils.validateAndClassifyQuery('12345678');
        expect(result).toEqual({ type: 'upc', value: '12345678' });
      });

      it('should classify valid 12-digit UPC as UPC', () => {
        const result = QueryUtils.validateAndClassifyQuery('123456789012');
        expect(result).toEqual({ type: 'upc', value: '123456789012' });
      });

      it('should classify longer numeric string as UPC', () => {
        const result = QueryUtils.validateAndClassifyQuery('1234567890123456');
        expect(result).toEqual({ type: 'upc', value: '1234567890123456' });
      });

      it('should handle UPC with leading zeros', () => {
        const result = QueryUtils.validateAndClassifyQuery('01234567');
        expect(result).toEqual({ type: 'upc', value: '01234567' });
      });
    });

    describe('Category classification', () => {
      it('should classify valid category as category', () => {
        const result = QueryUtils.validateAndClassifyQuery('widgets');
        expect(result).toEqual({ type: 'category', value: 'widgets' });
      });

      it('should classify and normalize case-insensitive category', () => {
        const result = QueryUtils.validateAndClassifyQuery('WIDGETS');
        expect(result).toEqual({ type: 'category', value: 'widgets' });
      });

      it('should classify mixed case category', () => {
        const result = QueryUtils.validateAndClassifyQuery('GaDgEtS');
        expect(result).toEqual({ type: 'category', value: 'gadgets' });
      });

      it('should handle category with extra whitespace', () => {
        const result = QueryUtils.validateAndClassifyQuery('  accessories  ');
        expect(result).toEqual({ type: 'category', value: 'accessories' });
      });
    });

    describe('Error cases', () => {
      it('should throw ValidationError for empty string', () => {
        expect(() => QueryUtils.validateAndClassifyQuery(''))
          .toThrow(ValidationError);
        expect(() => QueryUtils.validateAndClassifyQuery(''))
          .toThrow('Query cannot be empty.');
      });

      it('should throw ValidationError for whitespace-only string', () => {
        expect(() => QueryUtils.validateAndClassifyQuery('   '))
          .toThrow(ValidationError);
        expect(() => QueryUtils.validateAndClassifyQuery('   '))
          .toThrow('Query cannot be empty.');
      });

      it('should throw NotFoundError for short numeric string (treated as invalid category)', () => {
        expect(() => QueryUtils.validateAndClassifyQuery('1234567'))
          .toThrow(NotFoundError);
        expect(() => QueryUtils.validateAndClassifyQuery('1234567'))
          .toThrow('Invalid category.');
      });

      it('should throw NotFoundError for invalid category', () => {
        expect(() => QueryUtils.validateAndClassifyQuery('invalid_category'))
          .toThrow(NotFoundError);
        expect(() => QueryUtils.validateAndClassifyQuery('invalid_category'))
          .toThrow('Invalid category.');
      });

      it('should throw ValidationError for undefined input', () => {
        expect(() => QueryUtils.validateAndClassifyQuery(undefined as any))
          .toThrow(ValidationError);
      });

      it('should throw ValidationError for null input', () => {
        expect(() => QueryUtils.validateAndClassifyQuery(null as any))
          .toThrow(ValidationError);
      });
    });
  });

  describe('validateUPC', () => {
    it('should validate correct UPC without throwing', () => {
      expect(() => QueryUtils.validateUPC('12345678')).not.toThrow();
      expect(() => QueryUtils.validateUPC('123456789012')).not.toThrow();
    });

    it('should throw ValidationError for non-numeric UPC', () => {
      expect(() => QueryUtils.validateUPC('1234567a'))
        .toThrow(ValidationError);
      expect(() => QueryUtils.validateUPC('1234567a'))
        .toThrow('UPC must contain only numeric characters.');
    });

    it('should throw ValidationError for short UPC', () => {
      expect(() => QueryUtils.validateUPC('1234567'))
        .toThrow(ValidationError);
      expect(() => QueryUtils.validateUPC('1234567'))
        .toThrow('Invalid UPC code.');
    });

    it('should throw ValidationError for UPC with spaces', () => {
      expect(() => QueryUtils.validateUPC('123 456 78'))
        .toThrow(ValidationError);
      expect(() => QueryUtils.validateUPC('123 456 78'))
        .toThrow('UPC must contain only numeric characters.');
    });

    it('should throw ValidationError for UPC with special characters', () => {
      expect(() => QueryUtils.validateUPC('123-456-78'))
        .toThrow(ValidationError);
      expect(() => QueryUtils.validateUPC('123-456-78'))
        .toThrow('UPC must contain only numeric characters.');
    });
  });

  describe('validateAndNormalizeCategory', () => {
    it('should normalize valid categories', () => {
      expect(QueryUtils.validateAndNormalizeCategory('widgets')).toBe('widgets');
      expect(QueryUtils.validateAndNormalizeCategory('WIDGETS')).toBe('widgets');
      expect(QueryUtils.validateAndNormalizeCategory('Gadgets')).toBe('gadgets');
      expect(QueryUtils.validateAndNormalizeCategory('ACCESSORIES')).toBe('accessories');
    });

    it('should handle categories with whitespace', () => {
      expect(QueryUtils.validateAndNormalizeCategory('  widgets  ')).toBe('widgets');
      expect(QueryUtils.validateAndNormalizeCategory(' GADGETS ')).toBe('gadgets');
    });

    it('should throw NotFoundError for invalid categories', () => {
      expect(() => QueryUtils.validateAndNormalizeCategory('invalid'))
        .toThrow(NotFoundError);
      expect(() => QueryUtils.validateAndNormalizeCategory('invalid'))
        .toThrow('Invalid category.');
    });

    it('should throw NotFoundError for empty category', () => {
      expect(() => QueryUtils.validateAndNormalizeCategory(''))
        .toThrow(NotFoundError);
    });

    it('should throw NotFoundError for numeric string as category', () => {
      expect(() => QueryUtils.validateAndNormalizeCategory('12345'))
        .toThrow(NotFoundError);
    });
  });

  describe('validateResultNotEmpty', () => {
    it('should return items when array is not empty', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = QueryUtils.validateResultNotEmpty(items, 'No items found');
      expect(result).toBe(items);
    });

    it('should throw NotFoundError for empty array', () => {
      expect(() => QueryUtils.validateResultNotEmpty([], 'No items found'))
        .toThrow(NotFoundError);
      expect(() => QueryUtils.validateResultNotEmpty([], 'No items found'))
        .toThrow('No items found');
    });

    it('should throw NotFoundError for null array', () => {
      expect(() => QueryUtils.validateResultNotEmpty(null, 'No items found'))
        .toThrow(NotFoundError);
      expect(() => QueryUtils.validateResultNotEmpty(null, 'No items found'))
        .toThrow('No items found');
    });

    it('should throw NotFoundError for undefined array', () => {
      expect(() => QueryUtils.validateResultNotEmpty(undefined, 'No items found'))
        .toThrow(NotFoundError);
      expect(() => QueryUtils.validateResultNotEmpty(undefined, 'No items found'))
        .toThrow('No items found');
    });

    it('should use custom error message', () => {
      const customMessage = 'Custom error message';
      expect(() => QueryUtils.validateResultNotEmpty([], customMessage))
        .toThrow(customMessage);
    });
  });

  describe('createUPCNotFoundError', () => {
    it('should create error message for UPC without warehouse', () => {
      const message = QueryUtils.createUPCNotFoundError('12345678');
      expect(message).toBe('No inventory found for UPC "12345678".');
    });

    it('should create error message for UPC with warehouse', () => {
      const message = QueryUtils.createUPCNotFoundError('12345678', 'WH1');
      expect(message).toBe('No inventory found for UPC "12345678" in warehouse WH1.');
    });
  });

  describe('createCategoryNotFoundError', () => {
    it('should create error message for category without warehouse', () => {
      const message = QueryUtils.createCategoryNotFoundError('widgets');
      expect(message).toBe('No items found in category "widgets".');
    });

    it('should create error message for category with warehouse', () => {
      const message = QueryUtils.createCategoryNotFoundError('widgets', 'WH1');
      expect(message).toBe('No items found in category "widgets" for warehouse WH1.');
    });
  });

  describe('getValidCategories', () => {
    it('should return array of valid categories', () => {
      const categories = QueryUtils.getValidCategories();
      expect(categories).toEqual(['widgets', 'gadgets', 'accessories']);
    });

    it('should return readonly array (cannot be modified)', () => {
      const categories = QueryUtils.getValidCategories();
      // The array should be a new copy each time, which can be modified
      // but doesn't affect the original
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(3);
    });

    it('should return new array each time (not reference)', () => {
      const categories1 = QueryUtils.getValidCategories();
      const categories2 = QueryUtils.getValidCategories();
      expect(categories1).not.toBe(categories2);
      expect(categories1).toEqual(categories2);
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle mixed alphanumeric strings as categories', () => {
      expect(() => QueryUtils.validateAndClassifyQuery('widgets123'))
        .toThrow(NotFoundError);
    });

    it('should handle numeric strings with letters as categories', () => {
      expect(() => QueryUtils.validateAndClassifyQuery('123widgets'))
        .toThrow(NotFoundError);
    });

    it('should handle decimal numbers as categories', () => {
      expect(() => QueryUtils.validateAndClassifyQuery('123.45'))
        .toThrow(NotFoundError);
    });

    it('should handle negative numbers as categories', () => {
      expect(() => QueryUtils.validateAndClassifyQuery('-12345678'))
        .toThrow(NotFoundError);
    });

    it('should handle very long numeric strings as UPC', () => {
      const longUPC = '1'.repeat(20);
      const result = QueryUtils.validateAndClassifyQuery(longUPC);
      expect(result).toEqual({ type: 'upc', value: longUPC });
    });
  });
});