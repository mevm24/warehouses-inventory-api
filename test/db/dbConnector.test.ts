import { DBProvider, fetchInternalInventory, updateInternalInventory } from '../../src/db/dbConnector';

describe('Database Connector', () => {
  describe('fetchInternalInventory', () => {
    it('should return array of inventory items', async () => {
      const items = await fetchInternalInventory();

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
    });

    it('should return items with correct structure', async () => {
      const items = await fetchInternalInventory();
      const firstItem = items[0];

      expect(firstItem).toHaveProperty('upc');
      expect(firstItem).toHaveProperty('category');
      expect(firstItem).toHaveProperty('name');
      expect(firstItem).toHaveProperty('quantity');
      expect(typeof firstItem.upc).toBe('string');
      expect(typeof firstItem.category).toBe('string');
      expect(typeof firstItem.name).toBe('string');
      expect(typeof firstItem.quantity).toBe('number');
    });

    it('should include specific mock items', async () => {
      const items = await fetchInternalInventory();

      const superWidget = items.find((item) => item.upc === '12345678');
      expect(superWidget).toBeDefined();
      expect(superWidget?.name).toBe('Super Widget');
      expect(superWidget?.category).toBe('widgets');

      const ultraGadget = items.find((item) => item.upc === '87654321');
      expect(ultraGadget).toBeDefined();
      expect(ultraGadget?.name).toBe('Ultra Gadget');
      expect(ultraGadget?.category).toBe('gadgets');
    });
  });

  describe('updateInternalInventory', () => {
    it('should update item quantity successfully', async () => {
      const upc = '12345678';
      const quantityChange = 5;

      const originalInventory = await fetchInternalInventory();
      const originalItem = originalInventory.find((item) => item.upc === upc);
      const originalQuantity = originalItem?.quantity ?? 0;

      await updateInternalInventory(upc, quantityChange);

      const updatedInventory = await fetchInternalInventory();
      const updatedItem = updatedInventory.find((item) => item.upc === upc);

      expect(updatedItem?.quantity).toBe(originalQuantity + quantityChange);
    });

    it('should decrease quantity with negative change', async () => {
      const upc = '87654321';
      const quantityChange = -5;

      const originalInventory = await fetchInternalInventory();
      const originalItem = originalInventory.find((item) => item.upc === upc);
      const originalQuantity = originalItem?.quantity ?? 0;

      await updateInternalInventory(upc, quantityChange);

      const updatedInventory = await fetchInternalInventory();
      const updatedItem = updatedInventory.find((item) => item.upc === upc);

      expect(updatedItem?.quantity).toBe(originalQuantity + quantityChange);
    });

    it('should throw error for non-existent UPC', async () => {
      const nonExistentUpc = '00000000';

      await expect(updateInternalInventory(nonExistentUpc, 5)).rejects.toThrow(
        `Item with UPC ${nonExistentUpc} not found in Internal Inventory.`
      );
    });

    it('should limit deduction to available stock', async () => {
      const upc = '99990000';
      const quantityChange = -1000; // More than available

      const originalInventory = await fetchInternalInventory();
      const originalItem = originalInventory.find((item) => item.upc === upc);
      const originalQuantity = originalItem?.quantity ?? 0;

      // Should return the actual amount deducted (limited to available stock)
      const actuallyDeducted = await updateInternalInventory(upc, quantityChange);
      expect(actuallyDeducted).toBe(-originalQuantity); // Should be -5 (negative because it's a deduction)

      // Verify the item now has 0 quantity
      const updatedInventory = await fetchInternalInventory();
      const updatedItem = updatedInventory.find((item) => item.upc === upc);
      expect(updatedItem?.quantity).toBe(0);
    });

    it('should handle zero quantity change', async () => {
      const upc = '44445555';
      const quantityChange = 0;

      const originalInventory = await fetchInternalInventory();
      const originalItem = originalInventory.find((item) => item.upc === upc);
      const originalQuantity = originalItem?.quantity ?? 0;

      await updateInternalInventory(upc, quantityChange);

      const updatedInventory = await fetchInternalInventory();
      const updatedItem = updatedInventory.find((item) => item.upc === upc);

      expect(updatedItem?.quantity).toBe(originalQuantity);
    });
  });

  describe('DBProvider class', () => {
    let dbProvider: DBProvider;

    beforeEach(() => {
      dbProvider = new DBProvider();
    });

    it('should instantiate correctly', () => {
      expect(dbProvider).toBeInstanceOf(DBProvider);
    });

    it('should connect successfully', async () => {
      await expect(dbProvider.connect()).resolves.toBeUndefined();
    });

    it('should disconnect successfully', async () => {
      await expect(dbProvider.disconnect()).resolves.toBeUndefined();
    });

    it('should fetch inventory through class method', async () => {
      const items = await dbProvider.fetchInternalInventory();

      expect(items).toBeInstanceOf(Array);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('upc');
    });

    it('should update inventory through class method', async () => {
      const upc = '12345678';
      const quantityChange = 3;
      const originalInventory = await dbProvider.fetchInternalInventory();
      const originalItem = originalInventory.find((item) => item.upc === upc);
      const originalQuantity = originalItem?.quantity ?? 0;

      await dbProvider.updateInternalInventory(upc, quantityChange);

      const updatedInventory = await dbProvider.fetchInternalInventory();
      const updatedItem = updatedInventory.find((item) => item.upc === upc);

      expect(updatedItem?.quantity).toBe(originalQuantity + quantityChange);
    });

    it('should handle errors in class update method', async () => {
      await expect(dbProvider.updateInternalInventory('00000000', 5)).rejects.toThrow(
        'Item with UPC 00000000 not found'
      );
    });
  });
});
