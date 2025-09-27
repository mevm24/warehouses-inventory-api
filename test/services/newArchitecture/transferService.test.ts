import type {
  IInventoryService,
  ITransferStrategy,
  NormalizedInventoryItem,
  TransferRequest,
} from '../../../src/interfaces';
import { TransferService } from '../../../src/services/transferService';
import type { WarehouseServiceFactory } from '../../../src/services/warehouseServices';
import type { TransferStrategyFactory } from '../../../src/strategies/transferStrategies';

describe('TransferService (New Architecture)', () => {
  let transferService: TransferService;
  let mockInventoryService: jest.Mocked<IInventoryService>;
  let mockWarehouseFactory: jest.Mocked<WarehouseServiceFactory>;
  let mockStrategyFactory: jest.Mocked<TransferStrategyFactory>;
  let mockStrategy: jest.Mocked<ITransferStrategy>;

  const mockInventoryItems: NormalizedInventoryItem[] = [
    {
      source: 'A' as const,
      upc: '12345678',
      category: 'widgets',
      name: 'Test Widget',
      quantity: 15,
      locationDetails: {},
      transferCost: 0.2,
      transferTime: 1,
    },
    {
      source: 'B' as const,
      upc: '12345678',
      category: 'widgets',
      name: 'Test Widget B',
      quantity: 20,
      locationDetails: {},
      transferCost: 0.7,
      transferTime: 1.5,
    },
  ];

  beforeEach(() => {
    // Mock inventory service
    mockInventoryService = {
      getAllInventory: jest.fn(),
    };

    // Mock warehouse factory and services
    const mockWarehouseService = {
      getInventory: jest.fn(),
      updateInventory: jest.fn().mockResolvedValue(undefined),
    };

    mockWarehouseFactory = {
      create: jest.fn().mockReturnValue(mockWarehouseService),
    } as any;

    // Mock strategy
    mockStrategy = {
      calculate: jest.fn().mockReturnValue({ metric: 100, label: 'Cost: $100.00' }),
    };

    // Mock strategy factory
    mockStrategyFactory = {
      create: jest.fn().mockReturnValue(mockStrategy),
      registerStrategy: jest.fn(),
    } as any;

    transferService = new TransferService(mockInventoryService, mockWarehouseFactory, mockStrategyFactory);
  });

  describe('performTransfer', () => {
    const validRequest: TransferRequest = {
      from: 'A',
      to: 'B',
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest',
    };

    it('should perform transfer successfully with valid request', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);

      const result = await transferService.performTransfer(validRequest);

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('from A to B');
      expect(result).toContain('completed successfully');
      expect(mockInventoryService.getAllInventory).toHaveBeenCalledWith('12345678');
      expect(mockWarehouseFactory.create).toHaveBeenCalledWith('A');
    });

    it('should throw error when from warehouse is missing', async () => {
      const invalidRequest = { ...validRequest, from: undefined };

      await expect(transferService.performTransfer(invalidRequest as any)).rejects.toThrow(
        'Source and destination warehouses are required'
      );
    });

    it('should throw error when to warehouse is missing', async () => {
      const invalidRequest = { ...validRequest, to: undefined };

      await expect(transferService.performTransfer(invalidRequest as any)).rejects.toThrow(
        'Source and destination warehouses are required'
      );
    });

    it('should throw error for invalid warehouse IDs', async () => {
      const invalidRequest = { ...validRequest, from: 'X' };

      await expect(transferService.performTransfer(invalidRequest as any)).rejects.toThrow(
        'Invalid source or destination warehouse'
      );
    });

    it('should throw error when source equals destination', async () => {
      const invalidRequest = { ...validRequest, from: 'A', to: 'A' };

      await expect(transferService.performTransfer(invalidRequest as any)).rejects.toThrow(
        'Source and destination warehouses cannot be the same'
      );
    });

    it('should throw error for invalid quantity', async () => {
      const invalidRequest = { ...validRequest, quantity: 0 };

      await expect(transferService.performTransfer(invalidRequest as any)).rejects.toThrow(
        'Quantity must be a positive number'
      );
    });

    it('should throw error for insufficient stock', async () => {
      const lowStockItems = [
        { ...mockInventoryItems[0], quantity: 2 }, // Only 2 in stock
      ];
      mockInventoryService.getAllInventory.mockResolvedValue(lowStockItems);

      await expect(transferService.performTransfer({ ...validRequest, quantity: 5 })).rejects.toThrow(
        'Insufficient stock at warehouse A'
      );
    });

    it('should use correct transfer strategy', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);

      await transferService.performTransfer(validRequest);

      expect(mockStrategyFactory.create).toHaveBeenCalledWith('cheapest');
      expect(mockStrategy.calculate).toHaveBeenCalled();
    });
  });

  describe('performOptimalTransfer', () => {
    const optimalRequest = {
      to: 'B' as const,
      UPC: '12345678',
      quantity: 5,
      rule: 'cheapest' as const,
    };

    it('should select optimal source warehouse', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);

      const result = await transferService.performOptimalTransfer(optimalRequest);

      expect(result).toContain('Transfer of 5 units');
      expect(result).toContain('to B');
      expect(result).toContain('completed successfully');
    });

    it('should throw error when no destination provided', async () => {
      const invalidRequest = { ...optimalRequest, to: undefined };

      await expect(transferService.performOptimalTransfer(invalidRequest as any)).rejects.toThrow(
        'Destination warehouse is required'
      );
    });

    it('should throw error when no warehouse has sufficient stock', async () => {
      const lowStockItems = mockInventoryItems.map((item) => ({ ...item, quantity: 2 }));
      mockInventoryService.getAllInventory.mockResolvedValue(lowStockItems);

      await expect(transferService.performOptimalTransfer({ ...optimalRequest, quantity: 10 })).rejects.toThrow(
        'No warehouse has sufficient stock'
      );
    });

    it('should exclude destination warehouse from source selection', async () => {
      const itemsWithDestination = [
        ...mockInventoryItems,
        {
          source: 'B' as const, // Same as destination
          upc: '12345678',
          category: 'widgets',
          name: 'Test Widget B',
          quantity: 50,
          locationDetails: {},
          transferCost: 0.1,
          transferTime: 0.5,
        },
      ];
      mockInventoryService.getAllInventory.mockResolvedValue(itemsWithDestination);

      const result = await transferService.performOptimalTransfer(optimalRequest);

      // Should not select warehouse B as source since it's the destination
      expect(result).not.toContain('from B to B');
    });
  });

  describe('error handling', () => {
    it('should handle inventory service errors', async () => {
      mockInventoryService.getAllInventory.mockRejectedValue(new Error('Database error'));

      const validRequest: TransferRequest = {
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest',
      };

      await expect(transferService.performTransfer(validRequest)).rejects.toThrow('Database error');
    });

    it('should handle warehouse update errors', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);
      const mockWarehouseService = {
        getInventory: jest.fn(),
        updateInventory: jest.fn().mockRejectedValue(new Error('Update failed')),
      };
      mockWarehouseFactory.create.mockReturnValue(mockWarehouseService as any);

      const validRequest: TransferRequest = {
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest',
      };

      await expect(transferService.performTransfer(validRequest)).rejects.toThrow('Update failed');
    });
  });

  describe('integration', () => {
    it('should calculate distances and metrics correctly', async () => {
      mockInventoryService.getAllInventory.mockResolvedValue(mockInventoryItems);

      const result = await transferService.performTransfer({
        from: 'A',
        to: 'B',
        UPC: '12345678',
        quantity: 5,
        rule: 'cheapest',
      });

      expect(result).toContain('Distance:');
      expect(result).toContain('miles');
    });
  });
});
