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
- **Comprehensive testing** (419 tests passing with 95% coverage)
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
│   ├── costCalculatorService.ts  # V1: Cost calculations
│   ├── timeCalculatorService.ts  # V1: Time calculations
│   ├── warehouseServices.ts      # V1: Warehouse-specific services
│   ├── inventoryServiceV2.ts     # V2: Dynamic inventory service
│   ├── transferServiceV2.ts      # V2: N-warehouse transfer service
│   ├── warehouseAdapterV2.ts     # V2: Dynamic warehouse adapters
│   ├── calculatorServiceV2.ts    # V2: Dynamic calculations
│   ├── warehouseRegistryService.ts # V2: Warehouse registration
│   └── inventory.ts              # Legacy: Original monolithic service
├── strategies/           # Transfer strategy implementations
│   ├── transferStrategies.ts     # V1 strategies
│   └── transferStrategiesV2.ts   # V2 strategies
├── container/           # Dependency injection
│   ├── container.ts     # V1 container
│   └── containerV2.ts   # V2 container
├── interfaces/          # Type definitions and contracts
│   ├── services.ts      # V1 service interfaces
│   ├── servicesV2.ts    # V2 service interfaces
│   ├── warehouse.ts     # Warehouse configuration
│   └── general.ts       # Shared types
├── utils/              # Shared utilities
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

**Test Coverage**: 419 tests with 95% coverage including:
- 309 Unit tests (individual components)
- 84 Integration tests (service interactions)
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
| **Testability** | Tightly coupled | Independently testable (419 tests) |
| **Extensibility** | Hard-coded 3 warehouses | V1: 3 warehouses + V2: Dynamic N warehouses |
| **Dependencies** | Direct instantiation | Dependency injection containers |
| **Error Handling** | Basic try-catch | Custom error types with validation |
| **Code Reuse** | Duplication | Shared utilities and adapters |
| **Performance** | Sequential processing | Parallel warehouse queries (3x faster) |
| **SOLID Compliance** | 0/5 principles | 5/5 principles fully implemented |

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