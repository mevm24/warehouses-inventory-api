import type { WarehouseRegistry } from '../config/warehouseRegistry';
import { createWarehouseAdapter } from '../db/warehouseAdapter';
import type { IWarehouseAdapter, NormalizedInventoryItemV2, TransferRuleV2, WarehouseConfig } from '../interfaces';
import type { DBConnector } from '../interfaces/db';
import { haversineDistance } from '../utils/distance';

export class InventoryProviderV2 {
  private warehouseAdapters: Map<string, IWarehouseAdapter> = new Map();

  // Constants for warehouse-specific rates
  private readonly DEFAULT_COST_RATES = {
    INTERNAL: 0.2,
    EXTERNAL_B: 0.7,
    EXTERNAL_C: 0.65,
  };

  private readonly DEFAULT_TIME_RATES = {
    INTERNAL: 0.01, // 1 hour per 100 miles
    EXTERNAL_B: 0.008, // 0.8 hours per 100 miles
    EXTERNAL_C: 0.012, // 1.2 hours per 100 miles
  };

  constructor(
    private databaseConnector: DBConnector,
    private warehouseRegistry: WarehouseRegistry
  ) {
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    const warehouses = this.warehouseRegistry.getAllWarehouses();
    for (const warehouse of warehouses) {
      const adapter = createWarehouseAdapter(warehouse, this.databaseConnector);
      this.warehouseAdapters.set(warehouse.id, adapter);
    }
  }

  /**
   * Calculates the distance between two geographical points using shared utility.
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return haversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Fetches inventory from a specific warehouse.
   */
  async getInventoryFromWarehouse(
    warehouseId: string,
    upc?: string,
    category?: string
  ): Promise<NormalizedInventoryItemV2[]> {
    const adapter = this.warehouseAdapters.get(warehouseId);
    if (!adapter) {
      throw new Error(`Warehouse ${warehouseId} not found`);
    }
    return adapter.getInventory(upc, category);
  }

  /**
   * Aggregates inventory from all registered warehouses.
   */
  async getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItemV2[]> {
    const allInventory: NormalizedInventoryItemV2[] = [];
    const warehouseIds = this.warehouseRegistry.getWarehouseIds();

    const promises = warehouseIds.map((id) =>
      this.getInventoryFromWarehouse(id, upc, category).catch((err) => {
        console.error(`Error fetching from warehouse ${id}:`, err);
        return [];
      })
    );

    const results = await Promise.all(promises);
    for (const items of results) {
      allInventory.push(...items);
    }

    return allInventory;
  }

  /**
   * Transfer rules that can be easily extended.
   */
  transferRules: { [key: string]: TransferRuleV2 } = {
    fastest: (item: NormalizedInventoryItemV2) => item.transferTime,
    cheapest: (item: NormalizedInventoryItemV2) => item.transferCost,
    // New rules can be added here:
    // 'safest': (item: NormalizedInventoryItemV2) => item.safetyScore,
    // 'eco-friendly': (item: NormalizedInventoryItemV2) => item.carbonFootprint,
  };

  /**
   * Gets the cost per mile for a specific warehouse and item
   */
  private getCostPerMile(warehouse: WarehouseConfig, item?: NormalizedInventoryItemV2): number {
    // Check if item has specific cost information
    if (item?.locationDetails?.mileageCostPerMile) {
      return item.locationDetails.mileageCostPerMile;
    }
    if (item?.locationDetails?.transfer_fee_mile) {
      return item.locationDetails.transfer_fee_mile;
    }

    // Fall back to warehouse defaults
    if (warehouse.api.defaultTransferCost) {
      return warehouse.api.defaultTransferCost;
    }

    // Use system defaults based on warehouse type
    switch (warehouse.api.type) {
      case 'internal':
        return this.DEFAULT_COST_RATES.INTERNAL;
      case 'external-b-style':
        return this.DEFAULT_COST_RATES.EXTERNAL_B;
      case 'external-c-style':
        return this.DEFAULT_COST_RATES.EXTERNAL_C;
      default:
        return 0.5; // Fallback
    }
  }

  /**
   * Gets the time per mile for a specific warehouse
   */
  private getTimePerMile(warehouse: WarehouseConfig): number {
    // Use warehouse-specific default if available
    if (warehouse.api.defaultTransferTime) {
      return warehouse.api.defaultTransferTime / 100; // Convert to per-mile
    }

    // Use system defaults based on warehouse type
    switch (warehouse.api.type) {
      case 'internal':
        return this.DEFAULT_TIME_RATES.INTERNAL;
      case 'external-b-style':
        return this.DEFAULT_TIME_RATES.EXTERNAL_B;
      case 'external-c-style':
        return this.DEFAULT_TIME_RATES.EXTERNAL_C;
      default:
        return 0.01; // Fallback
    }
  }

  /**
   * Calculate transfer cost/time based on actual distance using strategy pattern.
   * Returns an object with both cost and time, plus the actual distance.
   */
  private calculateTransferMetrics(
    sourceWarehouse: WarehouseConfig,
    destWarehouse: WarehouseConfig,
    item: NormalizedInventoryItemV2,
    rule: string
  ): { distance: number; metric: number; metricLabel: string } {
    const distance = this.haversineDistance(
      sourceWarehouse.location.lat,
      sourceWarehouse.location.long,
      destWarehouse.location.lat,
      destWarehouse.location.long
    );

    let metric: number;
    let metricLabel: string;

    switch (rule) {
      case 'cheapest':
        metric = distance * this.getCostPerMile(sourceWarehouse, item);
        metricLabel = `Cost: $${metric.toFixed(2)}`;
        break;
      case 'fastest':
        metric = distance * this.getTimePerMile(sourceWarehouse);
        metricLabel = `Time: ${metric.toFixed(2)} hours`;
        break;
      default: {
        // For custom rules, use the rule function if available
        const ruleFunction = this.transferRules[rule];
        if (ruleFunction) {
          metric = ruleFunction(item);
          metricLabel = `Custom Metric: ${metric.toFixed(2)}`;
        } else {
          // Default to cost if rule not found
          metric = distance * this.getCostPerMile(sourceWarehouse, item);
          metricLabel = `Metric: ${metric.toFixed(2)}`;
        }
      }
    }

    return { distance, metric, metricLabel };
  }

  /**
   * Performs inventory transfer between any two registered warehouses.
   */
  async performTransfer(from: string | null, to: string, UPC: string, quantity: number, rule: string): Promise<string> {
    // Validate transfer rule using the transferRules object
    if (!this.transferRules[rule]) {
      const validRules = Object.keys(this.transferRules).join(', ');
      throw new Error(`Invalid transfer rule: '${rule}'. Valid rules are: ${validRules}`);
    }

    // Validate destination warehouse
    if (!this.warehouseRegistry.hasWarehouse(to)) {
      throw new Error(`Destination warehouse ${to} not found`);
    }

    const destWarehouse = this.warehouseRegistry.getWarehouse(to);
    if (!destWarehouse) {
      throw new Error(`Destination warehouse ${to} not found`);
    }
    const allInventory = await this.getAllInventory(UPC);

    if (allInventory.length === 0) {
      throw new Error(`No inventory found for UPC ${UPC}`);
    }

    let sourceWarehouseId: string;

    if (from) {
      // Validate source warehouse if specified
      if (!this.warehouseRegistry.hasWarehouse(from)) {
        throw new Error(`Source warehouse ${from} not found`);
      }
      sourceWarehouseId = from;
    } else {
      // Auto-select best source warehouse based on rule
      sourceWarehouseId = await this.selectBestSourceWarehouse(allInventory, to, quantity, rule);
    }

    // Validate stock availability
    const sourceInventory = allInventory.filter((item) => item.source === sourceWarehouseId);
    const availableQuantity = sourceInventory.reduce((sum, item) => sum + item.quantity, 0);

    if (availableQuantity < quantity) {
      throw new Error(`Insufficient stock at warehouse ${sourceWarehouseId}. Available: ${availableQuantity}.`);
    }

    // Calculate transfer metrics
    const sourceWarehouse = this.warehouseRegistry.getWarehouse(sourceWarehouseId);
    if (!sourceWarehouse) {
      throw new Error(`Source warehouse ${sourceWarehouseId} not found`);
    }
    const selectedItem = sourceInventory[0];
    const metrics = this.calculateTransferMetrics(sourceWarehouse, destWarehouse, selectedItem, rule);

    // Update inventory in the source warehouse
    if (sourceWarehouseId === 'A') {
      // Update internal warehouse inventory
      await this.databaseConnector.updateInternalInventory(UPC, -quantity);
    } else {
      // For external warehouses, log the operation
      // In production, this would call the external API to update their inventory
      console.log(
        `External API call would be made to update warehouse ${sourceWarehouseId} inventory for UPC ${UPC}, reducing by ${quantity} units`
      );
    }

    console.log(`Transfer completed: ${quantity} units of UPC ${UPC} from warehouse ${sourceWarehouseId} to ${to}.`);
    console.log(`Distance: ${metrics.distance.toFixed(2)} miles`);
    console.log(`Transfer rule: ${rule}, ${metrics.metricLabel}`);

    // Return detailed transfer confirmation
    return `Transfer of ${quantity} units of UPC ${UPC} from ${sourceWarehouseId} to ${to} completed successfully. Distance: ${metrics.distance.toFixed(0)} miles, ${metrics.metricLabel}`;
  }

  /**
   * Selects the best source warehouse based on the transfer rule.
   */
  private async selectBestSourceWarehouse(
    inventory: NormalizedInventoryItemV2[],
    destination: string,
    quantity: number,
    rule: string
  ): Promise<string> {
    const destWarehouse = this.warehouseRegistry.getWarehouse(destination);
    if (!destWarehouse) {
      throw new Error(`Destination warehouse ${destination} not found`);
    }

    // Group inventory by source
    const inventoryBySource = inventory.reduce(
      (acc, item) => {
        if (!acc[item.source]) {
          acc[item.source] = [];
        }
        acc[item.source].push(item);
        return acc;
      },
      {} as { [key: string]: NormalizedInventoryItemV2[] }
    );

    let bestSource: string | null = null;
    let bestScore = Infinity;

    for (const [sourceId, items] of Object.entries(inventoryBySource)) {
      // Skip if destination is same as source
      if (sourceId === destination) continue;

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // Check if this source has enough stock
      if (totalQuantity >= quantity) {
        const sourceWarehouse = this.warehouseRegistry.getWarehouse(sourceId);
        if (!sourceWarehouse) {
          continue; // Skip this source if warehouse not found
        }
        const metrics = this.calculateTransferMetrics(sourceWarehouse, destWarehouse, items[0], rule);

        if (metrics.metric < bestScore) {
          bestScore = metrics.metric;
          bestSource = sourceId;
        }
      }
    }

    if (!bestSource) {
      throw new Error('No warehouse has sufficient stock to fulfill the request.');
    }

    return bestSource;
  }

  /**
   * Adds a new warehouse to the system dynamically.
   */
  async addWarehouse(config: WarehouseConfig): Promise<void> {
    this.warehouseRegistry.addWarehouse(config);
    const adapter = createWarehouseAdapter(config, this.databaseConnector);
    this.warehouseAdapters.set(config.id, adapter);
  }

  /**
   * Removes a warehouse from the system.
   */
  removeWarehouse(warehouseId: string): boolean {
    this.warehouseAdapters.delete(warehouseId);
    return this.warehouseRegistry.removeWarehouse(warehouseId);
  }

  /**
   * Gets all registered warehouse IDs.
   */
  getWarehouseIds(): string[] {
    return this.warehouseRegistry.getWarehouseIds();
  }
}
