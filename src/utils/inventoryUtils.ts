import type { InventoryUpdater, NormalizedInventoryItem, NormalizedInventoryItemV2 } from '../interfaces';

export async function transferInventoryBetweenWarehouses(
  sourceWarehouse: InventoryUpdater,
  destinationWarehouse: InventoryUpdater,
  UPC: string,
  quantity: number,
  items: NormalizedInventoryItemV2[] | NormalizedInventoryItem[]
): Promise<void> {
  let remainingToDeduct = quantity;

  for (const _item of items) {
    if (remainingToDeduct <= 0) break;

    // Request to deduct what we still need
    const actuallyDeducted = await sourceWarehouse.updateInventory(UPC, -remainingToDeduct);

    // actuallyDeducted is negative (e.g., -5 means 5 units were deducted)
    // If we requested -10 but got -5, it means only 5 were available in this record
    remainingToDeduct += actuallyDeducted; // Since actuallyDeducted is negative, this reduces remainingToDeduct
  }

  await destinationWarehouse.updateInventory(UPC, quantity);
}
