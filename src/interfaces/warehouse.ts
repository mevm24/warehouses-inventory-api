import { NormalizedInventoryItemV2 } from "./general";

export interface WarehouseLocation {
  lat: number;
  long: number;
}

export interface WarehouseApiConfig {
  type: 'internal' | 'external-b-style' | 'external-c-style';
  baseUrl?: string;
  endpoints?: {
    categories?: string;
    lookup?: string;
    inventory?: string;
    items?: string;
  };
  defaultTransferCost?: number;
  defaultTransferTime?: number;
}

export interface WarehouseConfig {
  id: string;
  name: string;
  location: WarehouseLocation;
  api: WarehouseApiConfig;
}


export interface IWarehouseAdapter {
  getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]>;
  updateInventory(upc: string, quantityChange: number): Promise<void>;
}