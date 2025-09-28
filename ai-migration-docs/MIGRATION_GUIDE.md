# Migration Guide: 3-Warehouse to N-Warehouse System

This guide explains how to migrate from the hardcoded 3-warehouse system to the flexible N-warehouse system.

## Overview of Changes

### New Architecture Components

1. **Warehouse Registry**: Central registry for all warehouses
2. **Warehouse Adapters**: Abstraction layer for different API types
3. **Configuration System**: JSON-based warehouse definitions
4. **Dynamic Management**: Add/remove warehouses at runtime

## Migration Steps

### Step 1: Update Your Imports

**Before (Old System):**
```typescript
import { InventoryProvider } from './services/inventory';
```

**After (New System):**
```typescript
import { InventoryProviderV2 } from './services/inventoryV2';
import { WarehouseConfigLoader } from './config/warehouseLoader';
```

### Step 2: Initialize the New System

**Before:**
```typescript
const inventoryProvider = new InventoryProvider(databaseProvider);
```

**After:**
```typescript
const registry = WarehouseConfigLoader.createRegistry();
const inventoryProvider = new InventoryProviderV2(databaseProvider, registry);
```

### Step 3: Update Transfer Calls

**Before (Required source warehouse):**
```typescript
await inventoryProvider.performTransfer('A', 'B', '12345678', 5, 'cheapest');
```

**After (Auto-select source or specify):**
```typescript
// Auto-select best source warehouse
await inventoryProvider.performTransfer(null, 'B', '12345678', 5, 'cheapest');

// Or specify source warehouse
await inventoryProvider.performTransfer('A', 'B', '12345678', 5, 'cheapest');
```

### Step 4: Update Controller Routes

**Before (Fixed endpoints):**
```
GET /inventory/:query
POST /inventory/transfer
```

**After (Enhanced endpoints):**
```
GET /inventory/warehouses              # List all warehouses
GET /inventory/:warehouseId/:query     # Query specific warehouse
GET /inventory/:query                  # Query all warehouses
POST /inventory/transfer               # Transfer (auto-select or specify source)
POST /inventory/warehouse/register     # Add new warehouse
DELETE /inventory/warehouse/:id        # Remove warehouse
```

## Key Benefits of N-Warehouse System

### 1. Scalability
- Add warehouses without code changes
- Remove warehouses dynamically
- Support for unlimited warehouses

### 2. Flexibility
- Multiple API types supported
- Custom transfer rules
- Configuration-driven setup

### 3. Maintainability
- Centralized warehouse management
- Adapter pattern for different APIs
- Easier testing and mocking

## Configuration Examples

### Adding a New Warehouse Type

Create a new adapter in `src/services/warehouseAdapter.ts`:

```typescript
export class NewStyleWarehouseAdapter implements IWarehouseAdapter {
  constructor(private config: WarehouseConfig) {}

  async getInventory(upc?: string, category?: string): Promise<NormalizedInventoryItem[]> {
    // Implement your custom API logic here
    const response = await axios.get(`${this.config.api.baseUrl}/custom-endpoint`);
    // Transform and return normalized inventory
  }
}
```

Then register it in the factory:
```typescript
case 'external-new-style':
  return new NewStyleWarehouseAdapter(config);
```

### Custom Transfer Rules

Add new business logic for warehouse selection:

```typescript
// In your service initialization
inventoryProvider.transferRules['custom-rule'] = (item) => {
  // Your custom scoring logic
  return someCalculation(item);
};
```

### Configuration File Example

Add warehouses to `src/config/warehouses.json`:

```json
{
  "warehouses": [
    {
      "id": "NEW_WAREHOUSE",
      "name": "New Acquisition",
      "location": { "lat": 40.7128, "long": -74.0060 },
      "api": {
        "type": "external-b-style",
        "baseUrl": "http://new.api",
        "endpoints": { "lookup": "/find", "inventory": "/items" },
        "defaultTransferCost": 0.5,
        "defaultTransferTime": 1.5
      }
    }
  ]
}
```

## API Changes

### New Endpoints

1. **GET /api/v1/inventory/warehouses**
   - Returns list of all registered warehouses

2. **POST /api/v1/inventory/warehouse/register**
   - Register a new warehouse dynamically
   - Body: `{ id, name, location, api }`

3. **DELETE /api/v1/inventory/warehouse/:id**
   - Remove a warehouse from the system

### Modified Endpoints

1. **POST /api/v1/inventory/transfer**
   - `from` field is now optional
   - System auto-selects best source if not provided
   - Validates against registered warehouses only

## Testing Updates

Update your tests to use the new system:

```typescript
import { WarehouseConfigLoader } from '../config/warehouseLoader';

const registry = WarehouseConfigLoader.createRegistry();
const inventoryProvider = new InventoryProviderV2(dbProvider, registry);
```

## Environment Variables

Set warehouse configuration path:
```bash
WAREHOUSE_CONFIG_PATH=./custom/warehouses.json
```

## Backwards Compatibility

The old endpoints still work, but we recommend migrating to:
- Use `inventoryV2.ts` controller for new endpoints
- Update your client code to handle dynamic warehouse IDs
- Test with the new system before fully migrating

## Next Steps

1. Update your client applications to use new endpoints
2. Configure warehouses via JSON instead of hardcoding
3. Implement custom transfer rules as needed
4. Add new warehouse types as your business grows

For questions or issues during migration, refer to the examples in `src/examples/nWarehouseExample.ts`.