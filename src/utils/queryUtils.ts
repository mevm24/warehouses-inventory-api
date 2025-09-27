import { ValidationError, NotFoundError } from '../errors/customErrors';

export interface QueryValidationResult {
  type: 'upc' | 'category';
  value: string;
}

export class QueryUtils {
  private static readonly VALID_CATEGORIES = ['widgets', 'gadgets', 'accessories'];
  private static readonly MIN_UPC_LENGTH = 8;
  private static readonly UPC_PATTERN = /^\d+$/;

  /**
   * Determines if a query string is a UPC or category and validates it
   */
  static validateAndClassifyQuery(query: string): QueryValidationResult {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Query cannot be empty.');
    }

    const trimmedQuery = query.trim();
    const isNumeric = this.UPC_PATTERN.test(trimmedQuery);

    if (isNumeric && trimmedQuery.length >= this.MIN_UPC_LENGTH) {
      this.validateUPC(trimmedQuery);
      return { type: 'upc', value: trimmedQuery };
    } else {
      const normalizedCategory = this.validateAndNormalizeCategory(trimmedQuery);
      return { type: 'category', value: normalizedCategory };
    }
  }

  /**
   * Validates UPC format and length
   */
  static validateUPC(upc: string): void {
    if (!this.UPC_PATTERN.test(upc)) {
      throw new ValidationError('UPC must contain only numeric characters.');
    }

    if (upc.length < this.MIN_UPC_LENGTH) {
      throw new ValidationError('Invalid UPC code.');
    }
  }

  /**
   * Validates and normalizes category name
   */
  static validateAndNormalizeCategory(category: string): string {
    const normalizedCategory = category.toLowerCase().trim();

    if (!this.VALID_CATEGORIES.includes(normalizedCategory)) {
      throw new NotFoundError('Invalid category.');
    }

    return normalizedCategory;
  }

  /**
   * Validates that a result array is not empty
   */
  static validateResultNotEmpty<T>(items: T[] | null | undefined, errorMessage: string): T[] {
    if (!items || items.length === 0) {
      throw new NotFoundError(errorMessage);
    }
    return items;
  }

  /**
   * Creates standardized error messages for UPC not found
   */
  static createUPCNotFoundError(upc: string, warehouseId?: string): string {
    if (warehouseId) {
      return `No inventory found for UPC "${upc}" in warehouse ${warehouseId}.`;
    }
    return `No inventory found for UPC "${upc}".`;
  }

  /**
   * Creates standardized error messages for category not found
   */
  static createCategoryNotFoundError(category: string, warehouseId?: string): string {
    if (warehouseId) {
      return `No items found in category "${category}" for warehouse ${warehouseId}.`;
    }
    return `No items found in category "${category}".`;
  }

  /**
   * Gets the list of valid categories
   */
  static getValidCategories(): readonly string[] {
    return [...this.VALID_CATEGORIES];
  }
}