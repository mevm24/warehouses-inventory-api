// --- Core Business Logic for Inventory Management ---
import axios from 'axios';
import { WAREHOUSE_LOCATIONS } from '../constants';
import type {
  NormalizedInventoryItem,
  TransferRequest,
  TransferRule,
  WarehouseBItem,
  WarehouseCItem,
} from '../interfaces';
import type { DBConnector } from '../interfaces/db';
import { getCategoryFromLabel } from '../utils/category';
import { haversineDistance } from '../utils/distance';

export class InventoryProvider {
  private databaseConnector: DBConnector;

  // Warehouse-specific cost rates (per mile) - extracted as constants
  private readonly COST_RATES = {
    A: 0.2,
    B_DEFAULT: 0.7,
    C_DEFAULT: 0.65,
  };

  // Warehouse-specific time rates (hours per mile) - extracted as constants
  private readonly TIME_RATES = {
    A: 0.01,
    B: 0.008,
    C: 0.012,
  };

  constructor(databaseConnector: DBConnector) {
    this.databaseConnector = databaseConnector;
  }

  /**
   * Gets cost per mile for a warehouse.
   * Single Responsibility: Only handles cost rate calculation.
   */
  private getCostPerMile(warehouse: 'A' | 'B' | 'C', item?: NormalizedInventoryItem): number {
    switch (warehouse) {
      case 'A':
        return this.COST_RATES.A;
      case 'B':
        return item?.locationDetails?.mileageCostPerMile || this.COST_RATES.B_DEFAULT;
      case 'C':
        return item?.locationDetails?.transfer_fee_mile || this.COST_RATES.C_DEFAULT;
      default:
        return this.COST_RATES.A;
    }
  }

  /**
   * Gets time per mile for a warehouse.
   * Single Responsibility: Only handles time rate calculation.
   */
  private getTimePerMile(warehouse: 'A' | 'B' | 'C'): number {
    return this.TIME_RATES[warehouse] || this.TIME_RATES.A;
  }

  /**
   * Calculates transfer metric using strategy pattern.
   * Open/Closed: Easy to extend with new rules.
   */
  private calculateTransferMetric(
    distance: number,
    warehouse: 'A' | 'B' | 'C',
    rule: string,
    item?: NormalizedInventoryItem
  ): { metric: number; label: string } {
    let metric: number;
    let label: string;

    switch (rule) {
      case 'cheapest':
        metric = distance * this.getCostPerMile(warehouse, item);
        label = `Cost: $${metric.toFixed(2)}`;
        break;
      case 'fastest':
        metric = distance * this.getTimePerMile(warehouse);
        label = `Time: ${metric.toFixed(2)} hours`;
        break;
      default: {
        // For custom rules, use the rule function if available
        const ruleFunction = this.transferRules[rule];
        if (ruleFunction && item) {
          metric = ruleFunction(item);
          label = `Custom Metric: ${metric.toFixed(2)}`;
        } else {
          // Default to cost if rule not found
          metric = distance * this.getCostPerMile(warehouse, item);
          label = `Metric: ${metric.toFixed(2)}`;
        }
      }
    }

    return { metric, label };
  }

  /**
   * Calculates the distance between two geographical points using the Haversine formula.
   * Delegates to shared utility for consistency across the application.
   */
  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return haversineDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Gets category based on product name using shared classifier.
   */
  async getCategoryFromUPC(productLabel: string): Promise<string> {
    return getCategoryFromLabel(productLabel);
  }

  /**
   * Fetches inventory from Warehouse A (internal mock database).
   */
  async getInventoryFromA(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    let items = await this.databaseConnector.fetchInternalInventory();
    if (upc) {
      items = items.filter((item) => item.upc === upc);
    }
    if (category) {
      items = items.filter((item) => item.category === category);
    }

    return items.map((item) => ({
      source: 'A',
      upc: item.upc,
      category: item.category,
      name: item.name,
      quantity: item.quantity,
      locationDetails: { coords: [WAREHOUSE_LOCATIONS.A.lat, WAREHOUSE_LOCATIONS.A.long] },
      transferCost: 0.2, // Mock cost
      transferTime: 1, // Mock time
    }));
  }

  /**
   * Fetches inventory from Warehouse B's external API.
   */
  async getInventoryFromB(upc?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const lookupResponse = await axios.post(`http://b.api/lookup/${upc}`);
      const skus: string[] = lookupResponse.data;
      const items: NormalizedInventoryItem[] = [];

      for (const sku of skus) {
        const inventoryResponse = await axios.get(`http://b.api/inventory/${sku}`);
        for (const bItem of inventoryResponse.data as WarehouseBItem[]) {
          const category = await this.getCategoryFromUPC(bItem.label);
          items.push({
            source: 'B',
            upc: upc,
            category: category,
            name: bItem.label,
            quantity: bItem.stock,
            locationDetails: { sku: bItem.sku, coords: bItem.coords, mileageCostPerMile: bItem.mileageCostPerMile },
            transferCost: bItem.mileageCostPerMile,
            transferTime: 1.5,
          });
        }
      }
      return items;
    } catch (error) {
      console.warn(
        `Failed to fetch inventory from warehouse B for UPC ${upc}:`,
        error instanceof Error ? error.message : error
      );
      return []; // Return empty array to allow other warehouses to work
    }
  }

  /**
   * Fetches inventory from Warehouse C's external API.
   */
  async getInventoryFromC(upc?: string): Promise<NormalizedInventoryItem[]> {
    if (!upc) return [];

    try {
      const response = await axios.get(`http://c.api/api/items?upc=${upc}`);
      const cItems: WarehouseCItem[] = response.data;

      return cItems.map((item) => ({
        source: 'C',
        upc: item.upc,
        category: getCategoryFromLabel(item.desc),
        name: item.desc,
        quantity: item.qty,
        locationDetails: {
          position: item.position,
          transfer_fee_mile: item.transfer_fee_mile,
        },
        transferCost: item.transfer_fee_mile,
        transferTime: 2.5,
      }));
    } catch (error) {
      console.warn(
        `Failed to fetch inventory from warehouse C for UPC ${upc}:`,
        error instanceof Error ? error.message : error
      );
      return []; // Return empty array to allow other warehouses to work
    }
  }

  /**
   * Aggregates inventory from all warehouses into a single, normalized list.
   */
  async getAllInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    const [aInventory, bInventory, cInventory] = await Promise.all([
      this.getInventoryFromA(upc, category),
      this.getInventoryFromB(upc),
      this.getInventoryFromC(upc),
    ]);
    return [...aInventory, ...bInventory, ...cInventory];
  }

  /**
   * Defines the available transfer rules.
   * This object can be easily extended to add more rules.
   */
  transferRules: { [key: string]: TransferRule } = {
    fastest: (item: NormalizedInventoryItem) => item.transferTime,
    cheapest: (item: NormalizedInventoryItem) => item.transferCost,
    // Add new rules here:
    // 'safest': (item: NormalizedInventoryItem) => someSafetyMetric,
  };

  /**
   * Performs the transfer of inventory using distance-based calculations.
   * Updates the inventory quantities in the source warehouse.
   */
  async performTransfer(
    from: 'A' | 'B' | 'C',
    to: 'A' | 'B' | 'C',
    UPC: string,
    quantity: number,
    rule: string
  ): Promise<string> {
    this.validateTransferRule(rule);
    const allInventory = await this.getAllInventory(UPC);
    const sourceInventory = allInventory.filter((item) => item.source === from);
    const availableQuantity = sourceInventory.reduce((sum, item) => sum + item.quantity, 0);

    if (availableQuantity < quantity) {
      throw new Error(`Insufficient stock at warehouse ${from}. Available: ${availableQuantity}.`);
    }

    // Calculate distance-based cost/time
    const sourceLocation = WAREHOUSE_LOCATIONS[from];
    const destinationLocation = WAREHOUSE_LOCATIONS[to];
    const distance = this.haversineDistance(
      sourceLocation.lat,
      sourceLocation.long,
      destinationLocation.lat,
      destinationLocation.long
    );

    // Calculate transfer metrics using the unified strategy
    const selectedItem = sourceInventory[0];
    const { label: metricLabel } = this.calculateTransferMetric(distance, from, rule, selectedItem);

    // Update inventory in the source warehouse
    if (from === 'A') {
      // Update internal warehouse inventory
      await this.databaseConnector.updateInternalInventory(UPC, -quantity);
    } else {
      // For external warehouses, log the operation
      // In production, this would call the external API to update their inventory
      console.log(
        `External API call would be made to update warehouse ${from} inventory for UPC ${UPC}, reducing by ${quantity} units`
      );
    }

    console.log(`Transfer completed: ${quantity} units of UPC ${UPC} from warehouse ${from} to ${to}.`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Transfer rule: ${rule}, ${metricLabel}`);

    return `Transfer of ${quantity} units of UPC ${UPC} from ${from} to ${to} completed successfully. Distance: ${distance.toFixed(0)} miles, ${metricLabel}`;
  }

  async performTransferWithNoFrom({ from, to, UPC, quantity, rule }: TransferRequest): Promise<string> {
    this.validateTransferRule(rule);
    const allInventory = await this.getAllInventory(UPC);
    const destinationLocation = WAREHOUSE_LOCATIONS[to as 'A' | 'B' | 'C'];

    let sourceWarehouse: 'A' | 'B' | 'C' | undefined;
    let bestScore = Infinity;

    // If the client specified a source, we use it.
    if (from) {
      sourceWarehouse = from;
    } else {
      // Otherwise, we find the best one based on distance calculations
      const availableSources: { [key: string]: number } = {};

      // Group inventory by source and check for sufficient quantity
      const inventoryBySource: { [key: string]: NormalizedInventoryItem[] } = allInventory.reduce(
        (acc, item) => {
          if (!acc[item.source]) {
            acc[item.source] = [];
          }
          acc[item.source].push(item);
          return acc;
        },
        {} as { [key: string]: NormalizedInventoryItem[] }
      );

      // Find the best source based on distance and rule
      for (const source in inventoryBySource) {
        // Skip if source is the same as destination
        if (source === to) {
          continue;
        }

        const items = inventoryBySource[source];
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

        // Check if this source has enough stock
        if (totalQuantity >= quantity) {
          const sourceLocation = WAREHOUSE_LOCATIONS[source as 'A' | 'B' | 'C'];
          const distance = this.haversineDistance(
            sourceLocation.lat,
            sourceLocation.long,
            destinationLocation.lat,
            destinationLocation.long
          );

          // Calculate score using the unified metric calculation
          const firstItem = items[0];
          const { metric: score } = this.calculateTransferMetric(distance, source as 'A' | 'B' | 'C', rule, firstItem);

          availableSources[source] = score;

          // Compare with the current best score
          if (score < bestScore) {
            bestScore = score;
            sourceWarehouse = source as 'A' | 'B' | 'C' | undefined;
          }
        }
      }

      if (!sourceWarehouse) {
        throw new Error('No warehouse has sufficient stock to fulfill the request.');
      }
    }

    const sourceInventory = allInventory.filter((item) => item.source === sourceWarehouse);
    const availableQuantity = sourceInventory.reduce((sum, item) => sum + item.quantity, 0);

    if (availableQuantity < quantity) {
      throw new Error(`Insufficient stock at warehouse ${sourceWarehouse}. Available: ${availableQuantity}.`);
    }

    // Calculate final distance and metrics
    const sourceLocation = WAREHOUSE_LOCATIONS[sourceWarehouse];
    const distance = this.haversineDistance(
      sourceLocation.lat,
      sourceLocation.long,
      destinationLocation.lat,
      destinationLocation.long
    );

    // Calculate final metrics using the unified strategy
    const selectedItem = sourceInventory[0];
    const { label: metricLabel } = this.calculateTransferMetric(distance, sourceWarehouse, rule, selectedItem);

    // Update inventory in the source warehouse
    if (sourceWarehouse === 'A') {
      await this.databaseConnector.updateInternalInventory(UPC, -quantity);
    } else {
      console.log(
        `External API call would be made to update warehouse ${sourceWarehouse} inventory for UPC ${UPC}, reducing by ${quantity} units`
      );
    }

    console.log(`Transfer completed: ${quantity} units of UPC ${UPC} from warehouse ${sourceWarehouse} to ${to}.`);
    console.log(`Distance: ${distance.toFixed(2)} miles`);
    console.log(`Transfer rule: ${rule}, ${metricLabel}`);

    return `Transfer of ${quantity} units of UPC ${UPC} from ${sourceWarehouse} to ${to} completed successfully. Distance: ${distance.toFixed(0)} miles, ${metricLabel}`;
  }

  private validateTransferRule(rule: string): void {
    if (!this.transferRules[rule]) {
      const validRules = Object.keys(this.transferRules).join(', ');
      throw new Error(`Invalid transfer rule: '${rule}'. Valid rules are: ${validRules}`);
    }
  }
}
