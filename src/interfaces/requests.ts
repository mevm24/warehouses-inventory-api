// === Request and Response Interfaces ===

/**
 * Raw request body structure for transfer requests (V1)
 */
export interface TransferRequestBody {
  from?: string;
  to?: string;
  UPC?: string;
  quantity?: number;
  rule?: string;
}

/**
 * Raw request body structure for transfer requests (V2)
 */
export interface TransferRequestBodyV2 {
  from?: string;
  to?: string;
  UPC?: string;
  quantity?: number;
  rule?: string;
}

/**
 * Raw request body structure for warehouse registration (V2)
 */
export interface WarehouseRegistrationBody {
  id?: string;
  name?: string;
  location?: unknown;
  api?: unknown;
}

/**
 * Represents the structure of an inventory transfer request.
 */
export interface TransferRequest {
  from: 'A' | 'B' | 'C' | undefined; // Warehouse ID (V1 compatible)
  to: 'A' | 'B' | 'C' | undefined; // Warehouse ID (V1 compatible)
  UPC: string;
  quantity: number;
  rule: 'fastest' | 'cheapest';
}

/**
 * V2 version with support for N warehouses
 */
export interface TransferRequestV2 {
  from: string | undefined; // Warehouse ID (supports any warehouse)
  to: string | undefined; // Warehouse ID (supports any warehouse)
  UPC: string;
  quantity: number;
  rule: 'fastest' | 'cheapest';
}
