export type WarehouseId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface WarehouseLocation {
  lat: number;
  long: number;
}

export interface WarehouseConfig {
  id: WarehouseId;
  location: WarehouseLocation;
  costPerMile: number;
  timePerMile: number;
}

export enum TransferRuleType {
  FASTEST = 'fastest',
  CHEAPEST = 'cheapest'
}