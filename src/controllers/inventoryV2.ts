// --- Refactored Express Router for N Warehouses ---
import { Router, Request, Response } from 'express';
import { DBProvider } from '../db/dbConnector';
import { InventoryProviderV2 } from '../services/inventoryV2';
import { TransferRequestV2 } from '../interfaces/general';
import { warehouseRegistry } from '../config/registry';

const router = Router();

/**
 * @api {get} /warehouses Get list of all registered warehouses
 */
router.get('/warehouses', async (req: Request, res: Response) => {
  try {
    const warehouses = warehouseRegistry.getAllWarehouses();
    res.json(warehouses.map(w => ({
      id: w.id,
      name: w.name,
      location: w.location,
      type: w.api.type
    })));
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ message: 'Failed to retrieve warehouses.' });
  }
});

/**
 * @api {get} /:warehouseId/:query Get inventory from specific warehouse
 */
router.get('/:warehouseId/:query', async (req: Request, res: Response) => {
  const { warehouseId, query } = req.params;
  const isUPC = /^\d{8,}$/.test(query);

  const databaseProvider = new DBProvider();
  const inventoryProvider = new InventoryProviderV2(databaseProvider, warehouseRegistry);

  try {
    // Validate warehouse exists
    if (!warehouseRegistry.hasWarehouse(warehouseId)) {
      return res.status(404).json({ message: `Warehouse "${warehouseId}" not found.` });
    }

    let items;
    if (isUPC) {
      // It's a UPC
      if (query.length < 8) {
        return res.status(400).json({ message: 'Invalid UPC code.' });
      }
      items = await inventoryProvider.getInventoryFromWarehouse(warehouseId, query);
    } else {
      // It's a category
      const category = query.toLowerCase();
      if (!['widgets', 'gadgets', 'accessories'].includes(category)) {
        return res.status(404).json({ message: 'Invalid category.' });
      }
      items = await inventoryProvider.getInventoryFromWarehouse(warehouseId, undefined, category);
    }

    if (items.length === 0) {
      const type = isUPC ? `UPC "${query}"` : `category "${query}"`;
      return res.status(404).json({
        message: `No inventory found for ${type} in warehouse ${warehouseId}.`
      });
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Failed to retrieve inventory.' });
  }
});

/**
 * @api {get} /:query Get inventory across all warehouses
 */
router.get('/:query', async (req: Request, res: Response) => {
  const query = req.params.query;
  const isUPC = /^\d{8,}$/.test(query);

  const databaseProvider = new DBProvider();
  const inventoryProvider = new InventoryProviderV2(databaseProvider, warehouseRegistry);

  try {
    let allItems;
    if (isUPC) {
      // It's a UPC
      if (query.length < 8) {
        return res.status(400).json({ message: 'Invalid UPC code.' });
      }
      allItems = await inventoryProvider.getAllInventory(query);
      if (allItems.length === 0) {
        return res.status(404).json({ message: `No inventory found for UPC "${query}".` });
      }
    } else {
      // It's a category
      const category = query.toLowerCase();
      if (!['widgets', 'gadgets', 'accessories'].includes(category)) {
        return res.status(404).json({ message: 'Invalid category.' });
      }
      allItems = await inventoryProvider.getAllInventory(undefined, category);
      if (allItems.length === 0) {
        return res.status(404).json({ message: `No items found in category "${category}".` });
      }
    }

    res.json(allItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Failed to retrieve inventory.' });
  }
});

/**
 * @api {post} /transfer Transfer inventory between warehouses
 */
router.post('/transfer', async (req: Request, res: Response) => {
  const { from, to, UPC, quantity, rule }: TransferRequestV2 = req.body;

  const databaseProvider = new DBProvider();
  const inventoryProvider = new InventoryProviderV2(databaseProvider, warehouseRegistry);
  const validWarehouses = inventoryProvider.getWarehouseIds();
  const validRules = Object.keys(inventoryProvider.transferRules);

  // Data Validation
  if (!to || !UPC || quantity === undefined || !rule) {
    return res.status(400).json({ message: 'Missing required fields (to, UPC, quantity, rule).' });
  }

  // From is optional - if not provided, system will auto-select
  if (from && !validWarehouses.includes(from)) {
    return res.status(400).json({
      message: `Invalid source warehouse. Valid options: ${validWarehouses.join(', ')}`
    });
  }

  if (!validWarehouses.includes(to)) {
    return res.status(400).json({
      message: `Invalid destination warehouse. Valid options: ${validWarehouses.join(', ')}`
    });
  }

  if (from && from === to) {
    return res.status(400).json({
      message: 'Source and destination warehouses cannot be the same.'
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }

  if (!validRules.includes(rule)) {
    return res.status(400).json({
      message: `Invalid transfer rule. Valid options: ${validRules.join(', ')}`
    });
  }

  try {
    const message = await inventoryProvider.performTransfer(from || null, to, UPC, quantity, rule);
    res.json({ message });
  } catch (error) {
    console.error('Error during inventory transfer:', error);
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Failed to process transfer.'
    });
  }
});

/**
 * @api {post} /warehouse/register Register a new warehouse
 */
router.post('/warehouse/register', async (req: Request, res: Response) => {
  const { id, name, location, api } = req.body;

  // Validate required fields
  if (!id || !name || !location || !api) {
    return res.status(400).json({
      message: 'Missing required fields (id, name, location, api).'
    });
  }

  if (warehouseRegistry.hasWarehouse(id)) {
    return res.status(400).json({
      message: `Warehouse with ID "${id}" already exists.`
    });
  }

  try {
    const databaseProvider = new DBProvider();
    const inventoryProvider = new InventoryProviderV2(databaseProvider, warehouseRegistry);

    await inventoryProvider.addWarehouse({
      id,
      name,
      location,
      api
    });

    res.json({
      message: `Warehouse "${name}" (${id}) registered successfully.`,
      warehouse: { id, name, location, type: api.type }
    });
  } catch (error) {
    console.error('Error registering warehouse:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to register warehouse.'
    });
  }
});

/**
 * @api {delete} /warehouse/:id Unregister a warehouse
 */
router.delete('/warehouse/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!warehouseRegistry.hasWarehouse(id)) {
    return res.status(404).json({
      message: `Warehouse "${id}" not found.`
    });
  }

  try {
    const databaseProvider = new DBProvider();
    const inventoryProvider = new InventoryProviderV2(databaseProvider, warehouseRegistry);

    const removed = inventoryProvider.removeWarehouse(id);

    if (removed) {
      res.json({
        message: `Warehouse "${id}" unregistered successfully.`
      });
    } else {
      res.status(500).json({
        message: `Failed to unregister warehouse "${id}".`
      });
    }
  } catch (error) {
    console.error('Error unregistering warehouse:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to unregister warehouse.'
    });
  }
});

export default router;