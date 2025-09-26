import { TransferServiceV2 } from '../../../src/services/transferServiceV2';
import { IInventoryServiceV2 } from '../../../src/services/inventoryServiceV2';
import { IWarehouseRegistryService } from '../../../src/services/warehouseRegistryService';
import { TransferStrategyFactoryV2 } from '../../../src/strategies/transferStrategiesV2';
import { ITransferStrategyV2 } from '../../../src/interfaces/servicesV2';
import { WarehouseAdapterFactory } from '../../../src/services/warehouseAdapterV2';
import { TransferRequestV2, NormalizedInventoryItemV2 } from '../../../src/interfaces/general';
import { WarehouseConfig } from '../../../src/interfaces/warehouse';
import { DBConnector } from '../../../src/interfaces/db';

describe('TransferServiceV2', () => {
  let transferService: TransferServiceV2;
  let mockInventoryService: jest.Mocked<IInventoryServiceV2>;
  let mockWarehouseRegistry: jest.Mocked<IWarehouseRegistryService>;
  let mockStrategyFactory: jest.Mocked<TransferStrategyFactoryV2>;
  let mockDbConnector: jest.Mocked<DBConnector>;
  let mockStrategy: jest.Mocked<ITransferStrategyV2>;

  const warehouseA: WarehouseConfig = {
    id: 'A',
    name: 'Warehouse A',
    location: { lat: 40.7128, long: -74.0060 },
    api: { type: 'internal' }
  };

  const warehouseB: WarehouseConfig = {
    id: 'B',
    name: 'Warehouse B',
    location: { lat: 34.0522, long: -118.2437 },
    api: { type: 'external-b-style', baseUrl: 'http://b.api' }
  };

  const mockInventoryItems: NormalizedInventoryItemV2[] = [
    {
      source: 'A',
      upc: '12345678',
      category: 'widgets',
      name: 'Widget A',
      quantity: 20,
      locationDetails: {},
      transferCost: 0.3,
      transferTime: 2
    },
    {
      source: 'B',
      upc: '12345678',
      category: 'widgets',
      name: 'Widget B',
      quantity: 15,
      locationDetails: {},
      transferCost: 0.8,
      transferTime: 3
    }
  ];

  beforeEach(() => {
    mockInventoryService = {
      getAllInventory: jest.fn(),
      getInventoryFromWarehouse: jest.fn(),
    };

    mockWarehouseRegistry = {
      getAllWarehouses: jest.fn(),
      hasWarehouse: jest.fn(),
      registerWarehouse: jest.fn(),
      unregisterWarehouse: jest.fn(),
      getWarehouse: jest.fn(),
    };

    mockStrategy = {
      calculate: jest.fn(),
    };

    mockStrategyFactory = {
      create: jest.fn(),
    } as any;

    mockDbConnector = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      fetchInternalInventory: jest.fn(),
      updateInternalInventory: jest.fn(),
    };

    transferService = new TransferServiceV2(
      mockInventoryService,
      mockStrategyFactory,
      mockWarehouseRegistry,
      mockDbConnector
    );

    jest.clearAllMocks();
  });

  describe('performTransfer', () => {
    const transferRequest: TransferRequestV2 = {
      from: 'A',
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest'
    };

    it('should successfully perform transfer between specific warehouses', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse
        .mockReturnValueOnce(warehouseA)
        .mockReturnValueOnce(warehouseB);
      mockStrategyFactory.create.mockReturnValue(mockStrategy);
      mockStrategy.calculate.mockReturnValue({ metric: 75.50, label: 'Cost: $75.50' });

      const result = await transferService.performTransfer(transferRequest);

      expect(mockInventoryService.getAllInventory).toHaveBeenCalledWith('12345678');
      expect(result).toContain('Transfer of 5 units of UPC 12345678 from A to B completed successfully');
      expect(result).toContain('Cost: $75.50');
    });

    it('should throw error when source or destination is missing', async () => {
      const invalidRequest: TransferRequestV2 = {
        from: undefined,
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest'
      };

      await expect(transferService.performTransfer(invalidRequest)).rejects.toThrow(
        'Source and destination warehouses are required'
      );
    });

    it('should throw error when UPC does not exist in any warehouse', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue([]);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);

      await expect(transferService.performTransfer(transferRequest)).rejects.toThrow(
        'No inventory found for UPC "12345678"'
      );
    });

    it('should throw error when source warehouse has insufficient stock', async () => {
      const lowStockItems: NormalizedInventoryItemV2[] = [
        { ...mockInventoryItems[0], quantity: 3 } // Only 3 units, need 5
      ];
      mockInventoryService.getAllInventory.mockResolvedValue(lowStockItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);

      await expect(transferService.performTransfer(transferRequest)).rejects.toThrow(
        'Insufficient stock at warehouse A. Available: 3'
      );
    });

    it('should throw error when warehouse is invalid', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(false);

      await expect(transferService.performTransfer(transferRequest)).rejects.toThrow(
        'Invalid source or destination warehouse'
      );
    });

    it('should throw error when source and destination are the same', async () => {
      const invalidRequest: TransferRequestV2 = {
        ...transferRequest,
        from: 'A',
        to: 'A'
      };
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);

      await expect(transferService.performTransfer(invalidRequest)).rejects.toThrow(
        'Source and destination warehouses cannot be the same'
      );
    });

    it('should throw error when quantity is invalid', async () => {
      const invalidRequest: TransferRequestV2 = {
        ...transferRequest,
        quantity: -5
      };
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);

      await expect(transferService.performTransfer(invalidRequest)).rejects.toThrow(
        'Quantity must be a positive number'
      );
    });
  });

  describe('performOptimalTransferV2', () => {
    const optimalRequest: Omit<TransferRequestV2, 'from'> = {
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest'
    };

    it('should successfully perform optimal transfer', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse
        .mockReturnValueOnce(warehouseB)  // destination warehouse
        .mockReturnValueOnce(warehouseA)  // source warehouse A in findOptimalSource
        .mockReturnValueOnce(warehouseB)  // source warehouse B in findOptimalSource (has less stock)
        .mockReturnValueOnce(warehouseA)  // source warehouse in executeTransfer
        .mockReturnValueOnce(warehouseB); // destination warehouse in executeTransfer
      mockStrategyFactory.create.mockReturnValue(mockStrategy);
      mockStrategy.calculate.mockReturnValue({ metric: 45.60, label: 'Cost: $45.60' });

      const result = await transferService.performOptimalTransferV2(optimalRequest);

      expect(result).toContain('Transfer of 5 units of UPC 12345678 from A to B completed successfully');
      expect(result).toContain('Cost: $45.60');
    });

    it('should throw error when destination warehouse is missing', async () => {
      const invalidRequest = {
        ...optimalRequest,
        to: undefined
      };

      await expect(transferService.performOptimalTransferV2(invalidRequest)).rejects.toThrow(
        'Destination warehouse is required'
      );
    });

    it('should throw error when destination warehouse is not found', async () => {
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(false);

      await expect(transferService.performOptimalTransferV2(optimalRequest)).rejects.toThrow(
        'Destination warehouse "B" not found'
      );
    });

    it('should throw error when UPC does not exist in any warehouse', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue([]);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseB);

      await expect(transferService.performOptimalTransferV2(optimalRequest)).rejects.toThrow(
        'No inventory found for UPC "12345678"'
      );
    });

    it('should throw error when no warehouse has sufficient stock', async () => {
      const lowStockItems: NormalizedInventoryItemV2[] = [
        { ...mockInventoryItems[0], quantity: 2 },
        { ...mockInventoryItems[1], quantity: 3 }
      ];
      mockInventoryService.getAllInventory.mockResolvedValue(lowStockItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseB);

      await expect(transferService.performOptimalTransferV2(optimalRequest)).rejects.toThrow(
        'No warehouse has sufficient stock to fulfill the request'
      );
    });

    it('should select optimal source based on strategy calculation', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse
        .mockReturnValueOnce(warehouseB)
        .mockReturnValueOnce(warehouseA)
        .mockReturnValueOnce(warehouseB)
        .mockReturnValueOnce(warehouseA);
      mockStrategyFactory.create.mockReturnValue(mockStrategy);

      // A is cheaper (30) than B (80)
      mockStrategy.calculate
        .mockReturnValueOnce({ metric: 30, label: 'Cost: $30.00' })
        .mockReturnValueOnce({ metric: 80, label: 'Cost: $80.00' })
        .mockReturnValueOnce({ metric: 30, label: 'Cost: $30.00' });

      const result = await transferService.performOptimalTransferV2(optimalRequest);

      expect(result).toContain('from A to B'); // Should select A as optimal source
    });

    it('should exclude destination warehouse from optimal source selection', async () => {
      const itemsIncludingDestination: NormalizedInventoryItemV2[] = [
        ...mockInventoryItems,
        {
          source: 'B', // Same as destination
          upc: '12345678',
          category: 'widgets',
          name: 'Widget B Dest',
          quantity: 100,
          locationDetails: {},
          transferCost: 0.1, // Very cheap but should be excluded
          transferTime: 1
        }
      ];

      mockInventoryService.getAllInventory.mockResolvedValue(itemsIncludingDestination);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse
        .mockReturnValueOnce(warehouseB)  // destination warehouse
        .mockReturnValueOnce(warehouseA)  // source warehouse A in findOptimalSource
        .mockReturnValueOnce(warehouseA)  // source warehouse in executeTransfer
        .mockReturnValueOnce(warehouseB); // destination warehouse in executeTransfer
      mockStrategyFactory.create.mockReturnValue(mockStrategy);
      mockStrategy.calculate.mockReturnValue({ metric: 30, label: 'Cost: $30.00' });

      const result = await transferService.performOptimalTransferV2(optimalRequest);

      // Should select A, not B (destination), even though B would be cheaper
      expect(result).toContain('from A to B');
    });
  });

  describe('performOptimalTransfer', () => {
    it('should delegate to performOptimalTransferV2', async () => {
      const request: Omit<TransferRequestV2, 'from'> = {
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'fastest'
      };

      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      mockWarehouseRegistry.hasWarehouse.mockReturnValue(true);
      mockWarehouseRegistry.getWarehouse.mockReturnValue(warehouseB);
      mockStrategyFactory.create.mockReturnValue(mockStrategy);
      mockStrategy.calculate.mockReturnValue({ metric: 2.5, label: 'Time: 2.50 hours' });

      const result = await transferService.performOptimalTransfer(request);

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('Time: 2.50 hours');
    });
  });
});