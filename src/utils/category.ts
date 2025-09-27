/**
 * Utility functions for product category determination
 * Single Responsibility: Only handles category classification logic
 */

/**
 * Determines product category based on product name/description
 * @param productLabel - Product name or description
 * @returns Category string
 */
export function getCategoryFromLabel(productLabel: string): string {
  const label = productLabel.toLowerCase();

  if (label.includes('widget')) {
    return 'widgets';
  }

  if (label.includes('gadget')) {
    return 'gadgets';
  }

  return 'accessories';
}
