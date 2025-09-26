import { InternalWarehouseAdapter, ExternalBStyleWarehouseAdapter, ExternalCStyleWarehouseAdapter, WarehouseAdapterFactory } from '../../../src/services/warehouseAdapterV2';
import { WarehouseConfig } from '../../../src/interfaces/warehouse';
import { DBConnector } from '../../../src/interfaces/db';
import { CategoryClassifier } from '../../../src/utils/category';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock CategoryClassifier
jest.mock('../../../src/utils/category');
const mockedCategoryClassifier = CategoryClassifier as jest.Mocked<typeof CategoryClassifier>;

describe('WarehouseAdapterV2', () => {
  const mockDbConnector: jest.Mocked<DBConnector> = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    fetchInternalInventory: jest.fn(),
    updateInternalInventory: jest.fn(),
  };

  const internalWarehouseConfig: WarehouseConfig = {
    id: 'TEST_INTERNAL',
    name: 'Test Internal Warehouse',
    location: { lat: 40.7128, long: -74.0060 },
    api: {
      type: 'internal',
      defaultTransferCost: 0.3,
      defaultTransferTime: 2
    }
  };

  const externalBConfig: WarehouseConfig = {
    id: 'TEST_B',
    name: 'Test B-Style Warehouse',
    location: { lat: 34.0522, long: -118.2437 },
    api: {
      type: 'external-b-style',
      baseUrl: 'http://test-b.api',
      endpoints: {
        lookup: '/lookup',
        inventory: '/inventory'
      },
      defaultTransferTime: 2.5
    }
  };

  const externalCConfig: WarehouseConfig = {
    id: 'TEST_C',
    name: 'Test C-Style Warehouse',
    location: { lat: 41.8781, long: -87.6298 },
    api: {
      type: 'external-c-style',
      baseUrl: 'http://test-c.api',
      endpoints: {
        items: '/api/items'
      },
      defaultTransferTime: 3.5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('InternalWarehouseAdapter', () => {
    let adapter: InternalWarehouseAdapter;

    beforeEach(() => {
      adapter = new InternalWarehouseAdapter(internalWarehouseConfig, mockDbConnector);
    });

    it('should get inventory from internal database', async () => {
      const mockInventory = [
        { upc: '12345678', category: 'widgets', name: 'Test Widget', quantity: 10 }
      ];
      mockDbConnector.fetchInternalInventory.mockResolvedValue(mockInventory);

      const result = await adapter.getInventory('12345678');

      expect(mockDbConnector.fetchInternalInventory).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        source: 'TEST_INTERNAL',
        upc: '12345678',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 10,
        locationDetails: { coords: [40.7128, -74.0060] },
        transferCost: 0.3,
        transferTime: 2
      });
    });

    it('should filter by UPC when provided', async () => {
      const mockInventory = [
        { upc: '12345678', category: 'widgets', name: 'Widget 1', quantity: 10 },
        { upc: '87654321', category: 'gadgets', name: 'Gadget 1', quantity: 5 }
      ];
      mockDbConnector.fetchInternalInventory.mockResolvedValue(mockInventory);

      const result = await adapter.getInventory('12345678');

      expect(result).toHaveLength(1);
      expect(result[0].upc).toBe('12345678');
    });

    it('should filter by category when provided', async () => {
      const mockInventory = [
        { upc: '12345678', category: 'widgets', name: 'Widget 1', quantity: 10 },
        { upc: '87654321', category: 'gadgets', name: 'Gadget 1', quantity: 5 }
      ];
      mockDbConnector.fetchInternalInventory.mockResolvedValue(mockInventory);

      const result = await adapter.getInventory(undefined, 'widgets');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('widgets');
    });

    it('should update inventory through database connector', async () => {
      await adapter.updateInventory('12345678', -5);

      expect(mockDbConnector.updateInternalInventory).toHaveBeenCalledWith('12345678', -5);
    });
  });

  describe('ExternalBStyleWarehouseAdapter', () => {
    let adapter: ExternalBStyleWarehouseAdapter;

    beforeEach(() => {
      adapter = new ExternalBStyleWarehouseAdapter(externalBConfig);
      mockedCategoryClassifier.getCategoryFromLabel.mockReturnValue('widgets');
    });

    it('should return empty array when no UPC provided', async () => {
      const result = await adapter.getInventory();
      expect(result).toEqual([]);
    });

    it('should fetch inventory from external B-style API', async () => {
      const mockLookupResponse = { data: ['SKU123'] };
      const mockInventoryResponse = {
        data: [
          {
            sku: 'SKU123',
            label: 'Test Widget',
            stock: 15,
            coords: [34.0522, -118.2437],
            mileageCostPerMile: 0.8
          }
        ]
      };

      mockedAxios.post.mockResolvedValue(mockLookupResponse);
      mockedAxios.get.mockResolvedValue(mockInventoryResponse);

      const result = await adapter.getInventory('12345678');

      expect(mockedAxios.post).toHaveBeenCalledWith('http://test-b.api/lookup/12345678');
      expect(mockedAxios.get).toHaveBeenCalledWith('http://test-b.api/inventory/SKU123');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        source: 'TEST_B',
        upc: 'SKU123',
        category: 'widgets',
        name: 'Test Widget',
        quantity: 15,
        locationDetails: { coords: [34.0522, -118.2437] },
        transferCost: 0.8,
        transferTime: 2.5
      });
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'));

      const result = await adapter.getInventory('12345678');

      expect(result).toEqual([]);
    });

    it('should update inventory with console log', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await adapter.updateInventory('12345678', -3);

      expect(consoleSpy).toHaveBeenCalledWith(
        'External API call would be made to update warehouse TEST_B inventory for UPC 12345678, changing by -3 units'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ExternalCStyleWarehouseAdapter', () => {
    let adapter: ExternalCStyleWarehouseAdapter;

    beforeEach(() => {
      adapter = new ExternalCStyleWarehouseAdapter(externalCConfig);
      mockedCategoryClassifier.getCategoryFromLabel.mockReturnValue('gadgets');
    });

    it('should fetch inventory from external C-style API', async () => {
      const mockResponse = {
        data: [
          {
            upc: '12345678',
            desc: 'Test Gadget',
            qty: 20,
            position: { lat: 41.8781, long: -87.6298 },
            transfer_fee_mile: 1.2
          }
        ]
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await adapter.getInventory('12345678');

      expect(mockedAxios.get).toHaveBeenCalledWith('http://test-c.api/api/items?upc=12345678');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        source: 'TEST_C',
        upc: '12345678',
        category: 'gadgets',
        name: 'Test Gadget',
        quantity: 20,
        locationDetails: { position: { lat: 41.8781, long: -87.6298 } },
        transferCost: 1.2,
        transferTime: 3.5
      });
    });

    it('should use custom items endpoint when configured', async () => {
      const customConfig = {
        ...externalCConfig,
        api: {
          ...externalCConfig.api,
          endpoints: { items: '/custom/items' }
        }
      };
      adapter = new ExternalCStyleWarehouseAdapter(customConfig);

      mockedAxios.get.mockResolvedValue({ data: [] });

      await adapter.getInventory('12345678');

      expect(mockedAxios.get).toHaveBeenCalledWith('http://test-c.api/custom/items?upc=12345678');
    });
  });

  describe('WarehouseAdapterFactory', () => {
    let factory: WarehouseAdapterFactory;

    beforeEach(() => {
      factory = new WarehouseAdapterFactory(mockDbConnector);
    });

    it('should create internal warehouse adapter', () => {
      const adapter = factory.create(internalWarehouseConfig);
      expect(adapter).toBeInstanceOf(InternalWarehouseAdapter);
    });

    it('should create external B-style warehouse adapter', () => {
      const adapter = factory.create(externalBConfig);
      expect(adapter).toBeInstanceOf(ExternalBStyleWarehouseAdapter);
    });

    it('should create external C-style warehouse adapter', () => {
      const adapter = factory.create(externalCConfig);
      expect(adapter).toBeInstanceOf(ExternalCStyleWarehouseAdapter);
    });

    it('should throw error for unknown warehouse type', () => {
      const unknownConfig: WarehouseConfig = {
        id: 'UNKNOWN',
        name: 'Unknown Warehouse',
        location: { lat: 0, long: 0 },
        api: { type: 'unknown' as any }
      };

      expect(() => factory.create(unknownConfig)).toThrow('Unknown warehouse API type: unknown');
    });
  });
});