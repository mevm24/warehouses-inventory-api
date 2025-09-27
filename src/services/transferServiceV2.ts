import type {
  DBConnector,
  IInventoryServiceV2,
  ITransferServiceV2,
  IWarehouseRegistryService,
  NormalizedInventoryItemV2,
  TransferRequestV2,
  WarehouseLocation,
} from '../interfaces';
import type { TransferStrategyFactoryV2 } from '../strategies/transferStrategiesV2';
import { haversineDistance } from '../utils/distance';
import { WarehouseAdapterFactory } from './warehouseAdapterV2';

export class TransferServiceV2 implements ITransferServiceV2 {
  private adapterFactory: WarehouseAdapterFactory;

  constructor(
    private inventoryService: IInventoryServiceV2,
    private strategyFactory: TransferStrategyFactoryV2,
    private warehouseRegistry: IWarehouseRegistryService,
    databaseConnector: DBConnector
  ) {
    this.adapterFactory = new WarehouseAdapterFactory(databaseConnector);
  }

  async performTransfer(request: TransferRequestV2): Promise<string> {
    const { from, to, UPC, quantity, rule } = request;

    if (!from || !to) {
      throw new Error('Source and destination warehouses are required');
    }

    this.validateTransferRequest(from, to, quantity);

    const allInventory = await this.inventoryService.getAllInventory(UPC);

    // Check if the UPC exists in any warehouse
    if (allInventory.length === 0) {
      throw new Error(`No inventory found for UPC "${UPC}".`);
    }

    const sourceInventory = allInventory.filter((item) => item.source === from);

    this.validateStockAvailability(sourceInventory, quantity, from);

    const transferResult = await this.executeTransfer(from, to, UPC, quantity, rule, sourceInventory[0]);
    return transferResult;
  }

  async performOptimalTransfer(request: Omit<TransferRequestV2, 'from'>): Promise<string> {
    return this.performOptimalTransferV2(request);
  }

  async performOptimalTransferV2(request: Omit<TransferRequestV2, 'from'>): Promise<string> {
    const { to, UPC, quantity, rule } = request;

    if (!to) {
      throw new Error('Destination warehouse is required');
    }

    if (!this.warehouseRegistry.hasWarehouse(to)) {
      throw new Error(`Destination warehouse "${to}" not found.`);
    }

    const allInventory = await this.inventoryService.getAllInventory(UPC);

    // Check if the UPC exists in any warehouse
    if (allInventory.length === 0) {
      throw new Error(`No inventory found for UPC "${UPC}".`);
    }

    const destinationWarehouse = this.warehouseRegistry.getWarehouse(to);

    if (!destinationWarehouse) {
      throw new Error(`Destination warehouse "${to}" not found.`);
    }

    const optimalSource = this.findOptimalSource(allInventory, to, quantity, rule, destinationWarehouse.location);

    if (!optimalSource) {
      throw new Error('No warehouse has sufficient stock to fulfill the request.');
    }

    const transferResult = await this.executeTransfer(
      optimalSource.warehouse,
      to,
      UPC,
      quantity,
      rule,
      optimalSource.item
    );
    return transferResult;
  }

  private validateTransferRequest(from: string, to: string, quantity: number): void {
    if (!this.warehouseRegistry.hasWarehouse(from) || !this.warehouseRegistry.hasWarehouse(to)) {
      throw new Error('Invalid source or destination warehouse.');
    }

    if (from === to) {
      throw new Error('Source and destination warehouses cannot be the same.');
    }

    if (quantity <= 0) {
      throw new Error('Quantity must be a positive number.');
    }
  }

  private validateStockAvailability(inventory: NormalizedInventoryItemV2[], quantity: number, warehouse: string): void {
    const availableQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

    if (availableQuantity < quantity) {
      throw new Error(`Insufficient stock at warehouse ${warehouse}. Available: ${availableQuantity}.`);
    }
  }

  private findOptimalSource(
    allInventory: NormalizedInventoryItemV2[],
    destination: string,
    quantity: number,
    rule: string,
    destinationLocation: WarehouseLocation
  ): { warehouse: string; item: NormalizedInventoryItemV2 } | null {
    const inventoryBySource = this.groupInventoryBySource(allInventory);
    let bestScore = Infinity;
    let optimalSource: { warehouse: string; item: NormalizedInventoryItemV2 } | null = null;

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

  private groupInventoryBySource(inventory: NormalizedInventoryItemV2[]): Map<string, NormalizedInventoryItemV2[]> {
    return inventory.reduce((acc, item) => {
      if (!acc.has(item.source)) {
        acc.set(item.source, []);
      }
      acc.get(item.source)?.push(item);
      return acc;
    }, new Map<string, NormalizedInventoryItemV2[]>());
  }

  private calculateTransferScore(
    source: string,
    destinationLocation: WarehouseLocation,
    rule: string,
    item: NormalizedInventoryItemV2
  ): number {
    const sourceWarehouse = this.warehouseRegistry.getWarehouse(source);
    if (!sourceWarehouse) {
      return Infinity;
    }

    const distance = haversineDistance(
      sourceWarehouse.location.lat,
      sourceWarehouse.location.long,
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
    item: NormalizedInventoryItemV2
  ): Promise<string> {
    const sourceWarehouse = this.warehouseRegistry.getWarehouse(from);
    const destinationWarehouse = this.warehouseRegistry.getWarehouse(to);

    if (!sourceWarehouse || !destinationWarehouse) {
      throw new Error('Invalid warehouse configuration');
    }

    const distance = haversineDistance(
      sourceWarehouse.location.lat,
      sourceWarehouse.location.long,
      destinationWarehouse.location.lat,
      destinationWarehouse.location.long
    );

    const strategy = this.strategyFactory.create(rule);
    const { label: metricLabel } = strategy.calculate(distance, item);

    const sourceWarehouseAdapter = this.adapterFactory.create(sourceWarehouse);
    await sourceWarehouseAdapter.updateInventory(UPC, -quantity);

    console.log(`Transfer completed: ${quantity} units of UPC ${UPC} from warehouse ${from} to ${to}.`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Transfer rule: ${rule}, ${metricLabel}`);

    return `Transfer of ${quantity} units of UPC ${UPC} from ${from} to ${to} completed successfully. Distance: ${distance.toFixed(0)} miles, ${metricLabel}`;
  }
}
