import { NormalizedInventoryItemV2 } from './general';

export interface ITransferStrategyV2 {
  calculate(distance: number, item: NormalizedInventoryItemV2): { metric: number; label: string };
}

export interface ICostCalculatorV2 {
  calculateCost(warehouse: string, distance: number, item?: NormalizedInventoryItemV2): number;
}

export interface ITimeCalculatorV2 {
  calculateTime(warehouse: string, distance: number): number;
}