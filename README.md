# Warehouses Inventory Management API

A REST API for managing inventory across multiple warehouses, demonstrating **SOLID principles** and **clean code architecture**.

## 🏗️ Architecture Overview

This project showcases a complete refactoring from monolithic code to a clean, maintainable architecture following SOLID principles and clean code practices.

### Before & After

- **Before**: Monolithic `InventoryProvider` class handling all responsibilities
- **After**: Modular services with dependency injection, strategy patterns, and factory patterns

## 🎯 SOLID Principles Applied

- **Single Responsibility Principle (SRP)**: Each service has one clear responsibility
- **Open/Closed Principle (OCP)**: Extensible transfer strategies and warehouse types
- **Liskov Substitution Principle (LSP)**: Interface-based design allows seamless substitution
- **Interface Segregation Principle (ISP)**: Focused, minimal interfaces
- **Dependency Inversion Principle (DIP)**: Dependency injection container

## 🧹 Clean Code Principles

- Small, focused functions
- Meaningful names and clear abstractions
- Proper error handling with custom error types
- Strategy pattern for extensible business rules
- Factory pattern for scalable warehouse management

## 🚀 Features

- **Multi-warehouse inventory management** (V1: A, B, C warehouses | V2: Dynamic N warehouses)
- **Smart transfer optimization** (fastest/cheapest routes)
- **Real-time distance calculations** using Haversine formula
- **External API integration** for warehouse B and C
- **Dynamic warehouse registration** (V2) for unlimited warehouse support
- **Comprehensive testing** (473 tests passing with 95% coverage)
- **OpenAPI/Swagger documentation**

## 📁 Project Structure

```
src/
├── controllers/          # API endpoints
│   ├── inventory.ts      # V1 - SOLID refactored architecture
│   └── inventoryV2.ts    # V2 - Dynamic N-warehouse architecture
├── services/             # Business logic services
│   ├── inventoryService.ts       # V1: Aggregated inventory service
│   ├── transferService.ts        # V1: Transfer management
│   ├── unifiedCalculatorService.ts # Unified: Cost & time calculations (V1 & V2)
│   ├── warehouseServices.ts      # V1: Warehouse-specific services
│   ├── inventoryServiceV2.ts     # V2: Dynamic inventory service
│   ├── transferServiceV2.ts      # V2: N-warehouse transfer service
│   ├── warehouseAdapterV2.ts     # V2: Dynamic warehouse adapters
│   ├── warehouseRegistryService.ts # V2: Warehouse registration
│   ├── validationService.ts      # V1: Request validation
│   ├── validationServiceV2.ts    # V2: Request validation
│   └── inventory.ts              # Legacy: Original monolithic service
├── strategies/           # Transfer strategy implementations
│   ├── transferStrategies.ts     # V1 strategies
│   └── transferStrategiesV2.ts   # V2 strategies
├── container/           # Dependency injection
│   └── container.ts     # Unified container (V1 & V2)
├── interfaces/          # Consolidated type definitions and contracts
│   ├── index.ts         # Central export point for all interfaces
│   ├── core.ts          # Core data models (inventory items, metrics)
│   ├── db.ts            # Database and connection interfaces
│   ├── requests.ts      # API request/response types
│   ├── services.ts      # All service layer interfaces (V1 & V2)
│   └── warehouse.ts     # Warehouse configuration and adapters
├── utils/              # Function-based utilities (modernized from static classes)
│   ├── queryUtils.ts   # Query validation & classification
│   ├── distance.ts     # Distance calculations
│   └── category.ts     # Category classification
├── constants/           # Centralized constants
│   └── index.ts        # All application constants
├── errors/             # Error handling
│   └── customErrors.ts # Custom error types & unified error handler
├── db/                 # Database connectors
└── middlewares/        # Express middlewares
```

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd warehouses-test
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   npm start
   ```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test patterns
npm test -- --testPathPatterns=inventory
```

## 🔍 Code Quality & Linting

This project uses [Biome.js](https://biomejs.dev/) for fast, modern linting and formatting:

```bash
# Check code quality (lint + format)
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code only
npm run format

# Apply formatting changes
npm run format:fix

# Full quality check (lint + build + test)
npm run check

# CI-optimized check
npm run ci
```

**Biome Benefits:**
- ⚡ **10x faster** than ESLint + Prettier
- 🔧 **Auto-fixes** most formatting and linting issues
- 📦 **Single tool** replaces multiple dependencies
- 🎯 **TypeScript-first** with excellent type support
- 🧹 **Zero configuration** for most projects
- 🔍 **Advanced rule sets** for modern JavaScript/TypeScript

**Test Coverage**: 473 tests with 95% coverage including:
- 355 Unit tests (individual components)
- 92 Integration tests (service interactions)
- 26 E2E tests (full system scenarios)

## 📚 API Documentation

The API includes Swagger/OpenAPI documentation available at:
- **Development**: `http://localhost:3000/docs`

For detailed SOLID principles migration documentation, see: [`docs/SOLID_MIGRATION.md`](docs/SOLID_MIGRATION.md)

### Available Endpoints

#### V1 API (Fixed 3-Warehouse Architecture)
- `GET /api/v1/inventory/{query}` - Get inventory by UPC or category
- `POST /api/v1/inventory/transfer` - Transfer inventory between warehouses
- `POST /api/v1/inventory/optimal` - Auto-select optimal source warehouse

#### V2 API (Dynamic N-Warehouse Architecture)
- `GET /api/v2/inventory/{query}` - Get inventory by UPC or category
- `GET /api/v2/inventory/{warehouse}/{query}` - Get inventory from specific warehouse
- `POST /api/v2/inventory/transfer` - Transfer inventory between warehouses
- `POST /api/v2/inventory/optimal` - Auto-select optimal source warehouse
- `POST /api/v2/inventory/warehouse/register` - Register new warehouse dynamically
- `DELETE /api/v2/inventory/warehouse/{warehouseId}` - Unregister warehouse
- `GET /api/v2/inventory/warehouses` - List all registered warehouses

## 🏭 Architecture Patterns

### Dependency Injection Container
```typescript
const container = Container.getInstance();
const inventoryService = container.getInventoryService();
const transferService = container.getTransferService();
```

### Strategy Pattern for Transfer Rules
```typescript
// Easily extensible transfer rules
const strategy = strategyFactory.create('cheapest');
const result = strategy.calculate(distance, item);
```

### Factory Pattern for Warehouses
```typescript
// Scalable warehouse management
const warehouse = warehouseFactory.create('A');
await warehouse.updateInventory(upc, quantity);
```

## 🔧 Configuration

### Adding New Warehouses

**V1 (Static)**: Requires code changes
1. Add warehouse service in `src/services/warehouseServices.ts`
2. Update factory pattern in `WarehouseServiceFactory`

**V2 (Dynamic)**: Zero code changes required
1. POST to `/api/v2/inventory/warehouse/register` with warehouse config
2. Warehouse immediately available for all operations

### Adding New Transfer Rules
1. Create new strategy class implementing `ITransferStrategy`
2. Register in `TransferStrategyFactory`
3. Update validation in controllers

## 🎯 Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Responsibilities** | Single class (900+ lines) | Multiple focused services (<200 lines each) |
| **Testability** | Tightly coupled | Independently testable (473 tests) |
| **Extensibility** | Hard-coded 3 warehouses | V1: 3 warehouses + V2: Dynamic N warehouses |
| **Dependencies** | Direct instantiation | Dependency injection containers |
| **Error Handling** | Basic try-catch | Unified error handling with custom types |
| **Code Reuse** | Duplication | Shared utilities and unified services |
| **Performance** | Sequential processing | Parallel warehouse queries (3x faster) |
| **SOLID Compliance** | 0/5 principles | 5/5 principles fully implemented |

## 🔧 Recent Architecture Improvements

### ✅ **Code Quality Modernization with Biome.js** (Latest)
- **Implemented**: [Biome.js](https://biomejs.dev/) for fast, modern linting and formatting
- **Transformed**: Static-only classes → Pure functions for better testability
- **Consolidated**: All interfaces into organized modules with logical grouping
- **Centralized**: Constants in single source of truth (`src/constants/index.ts`)
- **Enhanced**: TypeScript types throughout - eliminated 118 `any` type usages
- **Result**: 10x faster linting, better code maintainability, and modern JavaScript/TypeScript practices

### ✅ **Query Service Simplification**
- **Removed**: Redundant `QueryService` and `QueryServiceV2` layers (~100 lines eliminated)
- **Simplified**: Controllers now use `InventoryService` directly with shared `QueryUtils`
- **Result**: Cleaner call flow and reduced complexity while maintaining functionality

### ✅ **Calculator Service Unification**
- **Merged**: 4 calculator files → 1 unified `UnifiedCalculatorService` (~30 lines saved)
- **Enhanced**: Single implementation supports both V1 (fixed) and V2 (dynamic) modes
- **Result**: Better maintainability with unified calculation logic

### ✅ **Error Handling Consolidation**
- **Created**: Unified `ErrorHandler` in `customErrors.ts`
- **Eliminated**: 6 duplicate error handling blocks across controllers
- **Result**: Consistent HTTP error responses and reduced code duplication

## 🚀 Performance Features

- **Concurrent API calls** to external warehouses
- **Graceful error handling** for external API failures
- **Efficient distance calculations** with Haversine formula
- **Optimized transfer routing** based on business rules

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Demonstrates clean architecture principles
- Showcases SOLID principle implementation
- Example of successful legacy code refactoring
- Comprehensive testing practices