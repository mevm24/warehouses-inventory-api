import { ITransferService, IInventoryService } from '../interfaces/services';
import { TransferRequest, NormalizedInventoryItem } from '../interfaces/general';
import { WAREHOUSE_LOCATIONS } from '../constants';
import { DistanceCalculator } from '../utils/distance';
import { TransferStrategyFactory } from '../strategies/transferStrategies';
import { WarehouseServiceFactory } from './warehouseServices';
import { TransferRuleType } from '../types/warehouse';

export class TransferService implements ITransferService {
  constructor(
    private inventoryService: IInventoryService,
    private warehouseFactory: WarehouseServiceFactory,
    private strategyFactory: TransferStrategyFactory
  ) {}

  async performTransfer(request: TransferRequest): Promise<string> {
    const { from, to, UPC, quantity, rule } = request;

    if (!from || !to) {
      throw new Error('Source and destination warehouses are required');
    }

    this.validateTransferRequest(from, to, quantity);

    const allInventory = await this.inventoryService.getAllInventory(UPC);
    const sourceInventory = allInventory.filter(item => item.source === from);

    this.validateStockAvailability(sourceInventory, quantity, from);

    const transferResult = await this.executeTransfer(from, to, UPC, quantity, rule, sourceInventory[0]);
    return transferResult;
  }

  async performOptimalTransfer(request: Omit<TransferRequest, 'from'>): Promise<string> {
    const { to, UPC, quantity, rule } = request;

    if (!to) {
      throw new Error('Destination warehouse is required');
    }

    const allInventory = await this.inventoryService.getAllInventory(UPC);
    const destinationLocation = WAREHOUSE_LOCATIONS[to as 'A' | 'B' | 'C'];

    const optimalSource = this.findOptimalSource(allInventory, to, quantity, rule, destinationLocation);

    if (!optimalSource) {
      throw new Error('No warehouse has sufficient stock to fulfill the request.');
    }

    const transferResult = await this.executeTransfer(optimalSource.warehouse, to, UPC, quantity, rule, optimalSource.item);
    return transferResult;
  }

  private validateTransferRequest(from: string, to: string, quantity: number): void {
    const validWarehouses = ['A', 'B', 'C'];

    if (!validWarehouses.includes(from) || !validWarehouses.includes(to)) {
      throw new Error('Invalid source or destination warehouse.');
    }

    if (from === to) {
      throw new Error('Source and destination warehouses cannot be the same.');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be a positive number.');
    }
  }

  private validateStockAvailability(inventory: NormalizedInventoryItem[], quantity: number, warehouse: string): void {
    const availableQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

    if (availableQuantity < quantity) {
      throw new Error(`Insufficient stock at warehouse ${warehouse}. Available: ${availableQuantity}.`);
    }
  }

  private findOptimalSource(
    allInventory: NormalizedInventoryItem[],
    destination: string,
    quantity: number,
    rule: string,
    destinationLocation: any
  ): { warehouse: string; item: NormalizedInventoryItem } | null {
    const inventoryBySource = this.groupInventoryBySource(allInventory);
    let bestScore = Infinity;
    let optimalSource: { warehouse: string; item: NormalizedInventoryItem } | null = null;

    for (const [source, items] of inventoryBySource.entries()) {
      if (source === destination) continue;

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQuantity >= quantity) {
        const score = this.calculateTransferScore(source, destinationLocation, rule, items[0]);

        if (score < bestScore) {
          bestScore = score;
          optimalSource = { warehouse: source, item: items[0] };
        }
      }
    }

    return optimalSource;
  }

  private groupInventoryBySource(inventory: NormalizedInventoryItem[]): Map<string, NormalizedInventoryItem[]> {
    return inventory.reduce((acc, item) => {
      if (!acc.has(item.source)) {
        acc.set(item.source, []);
      }
      acc.get(item.source)!.push(item);
      return acc;
    }, new Map<string, NormalizedInventoryItem[]>());
  }

  private calculateTransferScore(source: string, destinationLocation: any, rule: string, item: NormalizedInventoryItem): number {
    const sourceLocation = WAREHOUSE_LOCATIONS[source as 'A' | 'B' | 'C'];
    const distance = DistanceCalculator.haversineDistance(
      sourceLocation.lat,
      sourceLocation.long,
      destinationLocation.lat,
      destinationLocation.long
    );

    const strategy = this.strategyFactory.create(rule);
    const { metric } = strategy.calculate(distance, item);
    return metric;
  }

  private async executeTransfer(
    from: string,
    to: string,
    UPC: string,
    quantity: number,
    rule: string,
    item: NormalizedInventoryItem
  ): Promise<string> {
    const sourceLocation = WAREHOUSE_LOCATIONS[from as 'A' | 'B' | 'C'];
    const destinationLocation = WAREHOUSE_LOCATIONS[to as 'A' | 'B' | 'C'];

    const distance = DistanceCalculator.haversineDistance(
      sourceLocation.lat,
      sourceLocation.long,
      destinationLocation.lat,
      destinationLocation.long
    );

    const strategy = this.strategyFactory.create(rule);
    const { label: metricLabel } = strategy.calculate(distance, item);

    const sourceWarehouse = this.warehouseFactory.create(from);
    await sourceWarehouse.updateInventory(UPC, -quantity);

    console.log(`Transfer completed: ${quantity} units of UPC ${UPC} from warehouse ${from} to ${to}.`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Transfer rule: ${rule}, ${metricLabel}`);

    return `Transfer of ${quantity} units of UPC ${UPC} from ${from} to ${to} completed successfully. Distance: ${distance.toFixed(0)} miles, ${metricLabel}`;
  }
}