// === Service Layer Interfaces ===

import type { NormalizedInventoryItem, NormalizedInventoryItemV2 } from './core';
import type {
  TransferRequest,
  TransferRequestBody,
  TransferRequestBodyV2,
  TransferRequestV2,
  WarehouseRegistrationBody,
} from './requests';
import type { WarehouseConfig } from './warehouse';

// === Legacy V1 Service Interfaces ===

export interface IInventoryService {
  getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]>;
}

export interface IWarehouseService {
  getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]>;
  updateInventory(upc: string, quantityChange: number): Promise<void>;
}

export interface ITransferService {
  performTransfer(request: TransferRequest): Promise<string>;
  performOptimalTransfer(request: Omit<TransferRequest, 'from'>): Promise<string>;
}

export interface ITransferStrategy {
  calculate(distance: number, item: NormalizedInventoryItem): { metric: number; label: string };
}

export interface ICostCalculator {
  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItem): number;
}

export interface ITimeCalculator {
  calculateTime(warehouse: string, distance: number): number;
}

export interface IDistanceService {
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}

export interface ICategoryService {
  getCategoryFromLabel(label: string): Promise<string>;
}

export interface IValidationService {
  validateTransferRequest(requestBody: TransferRequestBody): TransferRequest;
}

// === V2 Service Interfaces ===

export interface IInventoryServiceV2 {
  getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
  getInventoryFromWarehouse(warehouseId: string, upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
}

export interface ITransferServiceV2 {
  performTransfer(request: TransferRequestV2): Promise<string>;
  performOptimalTransferV2(request: Omit<TransferRequestV2, 'from'>): Promise<string>;
}

export interface ITransferStrategyV2 {
  calculate(distance: number, item: NormalizedInventoryItemV2): { metric: number; label: string };
}

export interface ICostCalculatorV2 {
  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItemV2): number;
}

export interface ITimeCalculatorV2 {
  calculateTime(warehouse: string, distance: number): number;
}

export interface IValidationServiceV2 {
  validateTransferRequest(requestBody: TransferRequestBodyV2): TransferRequestV2;
  validateWarehouseRegistration(requestBody: WarehouseRegistrationBody): WarehouseConfig;
}

export interface IWarehouseRegistryService {
  getAllWarehouses(): WarehouseConfig[];
  getWarehouse(id: string): WarehouseConfig | undefined;
  hasWarehouse(id: string): boolean;
  registerWarehouse(config: WarehouseConfig): void;
  unregisterWarehouse(id: string): boolean;
}
