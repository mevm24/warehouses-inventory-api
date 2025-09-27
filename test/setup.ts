import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Create a fresh mock adapter for tests
const testMockAxios = new MockAdapter(axios, { delayResponse: 0 });

beforeEach(() => {
  testMockAxios.reset();

  // Re-setup mock responses for each test
  testMockAxios.onPost('http://b.api/lookup/12345678').reply(200, ['SKU1234']);
  testMockAxios.onPost('http://b.api/lookup/87654321').reply(200, ['SKU5678']);
  testMockAxios
    .onGet('http://b.api/inventory/SKU1234')
    .reply(200, [
      { sku: 'SKU1234', label: 'Super Widget', stock: 52, coords: [40.7128, -74.006], mileageCostPerMile: 0.7 },
    ]);
  testMockAxios
    .onGet('http://b.api/inventory/SKU5678')
    .reply(200, [
      { sku: 'SKU5678', label: 'Ultra Gadget', stock: 30, coords: [34.0522, -118.2437], mileageCostPerMile: 0.8 },
    ]);

  testMockAxios.onGet('http://c.api/api/cats').reply(200, ['Gadgets', 'Widgets', 'Accessories']);
  testMockAxios.onGet('http://c.api/api/items?upc=12345678').reply(200, [
    {
      upc: '12345678',
      desc: 'Widget - Super',
      qty: 25,
      position: { lat: 41.2, long: -73.7 },
      transfer_fee_mile: 0.65,
    },
  ]);
  testMockAxios.onGet('http://c.api/api/items?upc=98765432').reply(200, [
    {
      upc: '98765432',
      desc: 'Gadget - Smart',
      qty: 45,
      position: { lat: 34.2, long: -118.5 },
      transfer_fee_mile: 0.75,
    },
  ]);

  // Mock empty responses for non-existent UPCs
  testMockAxios.onPost(/http:\/\/b\.api\/lookup\/.*/).reply(200, []);
  testMockAxios.onGet(/http:\/\/c\.api\/api\/items\?upc=.*/).reply(200, []);

  // Default catch-all for unmatched requests
  testMockAxios.onAny().reply(404);
});

afterEach(() => {
  testMockAxios.reset();
  jest.clearAllMocks();
});
