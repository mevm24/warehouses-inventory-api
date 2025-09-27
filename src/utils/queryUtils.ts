import { MIN_UPC_LENGTH, UPC_PATTERN, VALID_CATEGORIES } from '../constants';
import { NotFoundError, ValidationError } from '../errors/customErrors';
import type { QueryValidationResult } from '../interfaces';

/**
 * Determines if a query string is a UPC or category and validates it
 */
export function validateAndClassifyQuery(query: string): QueryValidationResult {
  if (!query || query.trim().length === 0) {
    throw new ValidationError('Query cannot be empty.');
  }

  const trimmedQuery = query.trim();
  const isNumeric = UPC_PATTERN.test(trimmedQuery);

  if (isNumeric && trimmedQuery.length >= MIN_UPC_LENGTH) {
    validateUPC(trimmedQuery);
    return { type: 'upc', value: trimmedQuery };
  } else {
    const normalizedCategory = validateAndNormalizeCategory(trimmedQuery);
    return { type: 'category', value: normalizedCategory };
  }
}

/**
 * Validates UPC format and length
 */
export function validateUPC(upc: string): void {
  if (!UPC_PATTERN.test(upc)) {
    throw new ValidationError('UPC must contain only numeric characters.');
  }

  if (upc.length < MIN_UPC_LENGTH) {
    throw new ValidationError('Invalid UPC code.');
  }
}

/**
 * Validates and normalizes category name
 */
export function validateAndNormalizeCategory(category: string): string {
  const normalizedCategory = category.toLowerCase().trim();

  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    throw new NotFoundError('Invalid category.');
  }

  return normalizedCategory;
}

/**
 * Validates that a result array is not empty
 */
export function validateResultNotEmpty<T>(items: T[] | null | undefined, errorMessage: string): T[] {
  if (!items || items.length === 0) {
    throw new NotFoundError(errorMessage);
  }
  return items;
}

/**
 * Creates standardized error messages for UPC not found
 */
export function createUPCNotFoundError(upc: string, warehouseId?: string): string {
  if (warehouseId) {
    return `No inventory found for UPC "${upc}" in warehouse ${warehouseId}.`;
  }
  return `No inventory found for UPC "${upc}".`;
}

/**
 * Creates standardized error messages for category not found
 */
export function createCategoryNotFoundError(category: string, warehouseId?: string): string {
  if (warehouseId) {
    return `No items found in category "${category}" for warehouse ${warehouseId}.`;
  }
  return `No items found in category "${category}".`;
}

/**
 * Gets the list of valid categories
 */
export function getValidCategories(): readonly string[] {
  return [...VALID_CATEGORIES];
}
