import { NormalizedInventoryItem, TransferRequest } from './general';

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