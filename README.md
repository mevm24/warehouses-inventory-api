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

- **Multi-warehouse inventory management** (A, B, C + extensible to N warehouses)
- **Smart transfer optimization** (fastest/cheapest routes)
- **Real-time distance calculations** using Haversine formula
- **External API integration** for warehouse B and C
- **Comprehensive testing** (235 tests passing)
- **OpenAPI/Swagger documentation**

## 📁 Project Structure

```
src/
├── controllers/          # API endpoints
│   ├── inventory.ts      # V1 - New refactored architecture
│   └── inventoryV2.ts    # V2 - Original architecture (for comparison)
├── services/             # Business logic services
│   ├── inventoryService.ts      # New: Aggregated inventory service
│   ├── transferService.ts       # New: Transfer management
│   ├── costCalculatorService.ts # New: Cost calculations
│   ├── timeCalculatorService.ts # New: Time calculations
│   ├── warehouseServices.ts     # New: Warehouse-specific services
│   ├── inventory.ts            # Original: Monolithic service
│   └── inventoryV2.ts          # V2 extension
├── strategies/           # Transfer strategy implementations
│   └── transferStrategies.ts
├── container/           # Dependency injection
│   └── container.ts
├── interfaces/          # Type definitions and contracts
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

**Test Coverage**: 235 tests covering all services, controllers, and edge cases.

## 📚 API Documentation

The API includes Swagger/OpenAPI documentation available at:
- **Development**: `http://localhost:3000/docs`

### Available Endpoints

#### V1 API (Refactored Architecture)
- `GET /api/v1/inventory/{query}` - Get inventory by UPC or category
- `POST /api/v1/inventory/transfer` - Transfer inventory between warehouses

#### V2 API (Original Architecture)
- `GET /api/v2/inventory/{query}` - Get inventory by UPC or category
- `POST /api/v2/inventory/transfer` - Transfer inventory with auto-optimization

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
1. Add warehouse config to `src/config/warehouseRegistry.ts`
2. Implement warehouse service in `src/services/warehouseServices.ts`
3. Update factory pattern in `WarehouseServiceFactory`

### Adding New Transfer Rules
1. Create new strategy class implementing `ITransferStrategy`
2. Register in `TransferStrategyFactory`
3. Update validation in controllers

## 🎯 Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Responsibilities** | Single class (400+ lines) | Multiple focused services |
| **Testability** | Tightly coupled | Independently testable |
| **Extensibility** | Hard-coded logic | Strategy & Factory patterns |
| **Dependencies** | Direct instantiation | Dependency injection |
| **Error Handling** | Basic try-catch | Custom error types |
| **Code Reuse** | Duplication | Shared utilities |

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