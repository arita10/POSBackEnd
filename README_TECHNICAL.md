# POS Bakkal SaaS — Technical Ledger

> Multi-tenant Point of Sale system for Turkish "Bakkal" shops.
> Stack: NestJS + Prisma ORM + PostgreSQL (Aiven Cloud)

---

## Version History

| Version | Feature          | DB Changes                          | API Endpoints                                    |
|---------|-----------------|-------------------------------------|--------------------------------------------------|
| v0.1    | Core Tenancy    | Added `shops`, `users`, `permissions` tables + enums (`shop_status`, `user_role`) | `POST/GET /shops`, `GET/PUT/DELETE /shops/:id`, `POST/GET /shops/:shopId/users`, `GET/PUT/DELETE /shops/:shopId/users/:id`, `GET/PUT /shops/:shopId/users/:userId/permissions` |
| v0.2    | Stock & Inventory | Added `product_units`, `products`, `product_price_comparison` tables | `CRUD /shops/:shopId/product-units`, `CRUD /shops/:shopId/products`, `POST /shops/:shopId/products/:id/adjust-stock`, `CRUD /shops/:shopId/products/:productId/price-comparisons` |
| v0.3    | Sales & Expenses  | Added `sales_transactions`, `sales_items`, `expense_items` tables | `POST/GET /shops/:shopId/sales`, `GET /shops/:shopId/sales/daily`, `GET /shops/:shopId/sales/:id`, `CRUD /shops/:shopId/expenses`, `GET /shops/:shopId/expenses/daily` |
| v0.4    | Daily Balance     | Added `daily_balance_records` table | `GET /shops/:shopId/daily-balance/preview`, `POST /shops/:shopId/daily-balance/close`, `GET /shops/:shopId/daily-balance`, `GET /shops/:shopId/daily-balance/:id` |
| v0.5    | AI Price Agent    | No new tables (uses `product_price_comparison`) | `POST /ai-price-agent/trigger`, `GET /ai-price-agent/report/:shopId` |

---

## Database Schema

### Tables

| Table                       | Key Columns                                        | Tenancy          |
|-----------------------------|---------------------------------------------------|------------------|
| `shops`                     | id, shop_name, status                             | ROOT (tenant)    |
| `users`                     | id, shop_id, username, password, role             | shop_id → shops  |
| `permissions`               | id, user_id, can_manage_stock, can_view_reports   | via user → shop  |
| `product_units`             | id, shop_id, unit_name                            | shop_id → shops  |
| `products`                  | id, shop_id, unit_id, barcode, product_name, sale_price, stock_quantity | shop_id → shops |
| `product_price_comparison`  | id, product_id, competitor_name, competitor_price, last_updated | via product → shop |
| `sales_transactions`        | id, shop_id, user_id, total_price, created_at               | shop_id → shops  |
| `sales_items`               | id, transaction_id, product_id, quantity, price_at_sale     | via transaction → shop |
| `expense_items`             | id, shop_id, vendor_name, item_amount, expense_type, transaction_date | shop_id → shops |

### Enums

| Enum          | Values              |
|---------------|---------------------|
| `shop_status` | active, expired     |
| `user_role`   | owner, staff        |

### Relations

```
shops (1) ──→ (N) users (1) ──→ (1) permissions
shops (1) ──→ (N) product_units (1) ──→ (N) products (1) ──→ (N) product_price_comparison
shops (1) ──→ (N) products (also directly)
```

### Stock Precision

| Unit Type | Decimal Places | Example          | DB Type        |
|-----------|---------------|------------------|----------------|
| Adet      | 0 (whole)     | 48.000           | DECIMAL(10,3)  |
| KG        | 3 (grams)    | 5.500, 0.750     | DECIMAL(10,3)  |
| Price     | 2 (kuruş)    | 25.50, 180.00    | DECIMAL(10,2)  |

---

## API Endpoints

### Shops Management

| Method | Endpoint        | Description                    | Body                    |
|--------|----------------|--------------------------------|-------------------------|
| POST   | `/shops`        | Register a new shop            | `{ shopName }`          |
| GET    | `/shops`        | List all shops (admin)         | —                       |
| GET    | `/shops/:id`    | Get shop with users            | —                       |
| PUT    | `/shops/:id`    | Update shop name/status        | `{ shopName?, status? }`|
| DELETE | `/shops/:id`    | Delete shop + all data         | —                       |

### Users Management (Tenant-Scoped)

| Method | Endpoint                        | Description                  | Body                           |
|--------|---------------------------------|------------------------------|--------------------------------|
| POST   | `/shops/:shopId/users`          | Create user in shop          | `{ username, password, role? }`|
| GET    | `/shops/:shopId/users`          | List users in shop           | —                              |
| GET    | `/shops/:shopId/users/:id`      | Get user from shop           | —                              |
| PUT    | `/shops/:shopId/users/:id`      | Update user in shop          | `{ username?, password?, role? }`|
| DELETE | `/shops/:shopId/users/:id`      | Delete user from shop        | —                              |

### Permissions Management (Tenant-Scoped)

| Method | Endpoint                                        | Description              | Body                                   |
|--------|------------------------------------------------|--------------------------|----------------------------------------|
| GET    | `/shops/:shopId/users/:userId/permissions`      | View user permissions    | —                                      |
| PUT    | `/shops/:shopId/users/:userId/permissions`      | Update user permissions  | `{ canManageStock?, canViewReports? }` |

### Product Units Management (Tenant-Scoped)

| Method | Endpoint                              | Description              | Body               |
|--------|---------------------------------------|--------------------------|---------------------|
| POST   | `/shops/:shopId/product-units`        | Create a unit (Adet, KG) | `{ unitName }`     |
| GET    | `/shops/:shopId/product-units`        | List all units           | —                  |
| GET    | `/shops/:shopId/product-units/:id`    | Get one unit             | —                  |
| PUT    | `/shops/:shopId/product-units/:id`    | Rename a unit            | `{ unitName? }`    |
| DELETE | `/shops/:shopId/product-units/:id`    | Delete a unit            | —                  |

### Products Management (Tenant-Scoped)

| Method | Endpoint                                      | Description              | Body                                                    |
|--------|-----------------------------------------------|--------------------------|----------------------------------------------------------|
| POST   | `/shops/:shopId/products`                     | Add a product            | `{ unitId, barcode?, productName, salePrice, stockQuantity? }` |
| GET    | `/shops/:shopId/products`                     | List all products        | —                                                        |
| GET    | `/shops/:shopId/products/:id`                 | Get product detail       | —                                                        |
| PUT    | `/shops/:shopId/products/:id`                 | Update product           | `{ unitId?, barcode?, productName?, salePrice?, stockQuantity? }` |
| POST   | `/shops/:shopId/products/:id/adjust-stock`    | Add/remove stock         | `{ type: "add"\|"remove", quantity }`                    |
| DELETE | `/shops/:shopId/products/:id`                 | Delete a product         | —                                                        |

### Price Comparisons (Tenant-Scoped via Product)

| Method | Endpoint                                                           | Description                | Body                                    |
|--------|--------------------------------------------------------------------|----------------------------|-----------------------------------------|
| POST   | `/shops/:shopId/products/:productId/price-comparisons`             | Add/update competitor price | `{ competitorName, competitorPrice }`  |
| GET    | `/shops/:shopId/products/:productId/price-comparisons`             | List competitor prices     | —                                       |
| DELETE | `/shops/:shopId/products/:productId/price-comparisons/:id`         | Remove a comparison        | —                                       |

---

## Multi-Tenancy Strategy

Every table that holds shop-specific data includes a `shop_id` column. All queries filter by `shop_id` to ensure **complete data isolation** between tenants. The `shopId` is extracted from the URL parameter, never from the request body, to prevent injection.

```
Request: GET /shops/1/products
Service:  prisma.product.findMany({ where: { shopId: 1 } })
Result:   Only Shop 1's products returned. Shop 2's data is invisible.
```

**Indirect Tenancy**: Tables without their own `shopId` (permissions, price_comparisons) are secured through their parent relationship chain (e.g., price_comparison → product → shop).

---

## Project Structure

```
src/
├── prisma/
│   ├── prisma.module.ts           ← Global database module
│   └── prisma.service.ts          ← Database connection service
├── shops/
│   ├── dto/                       ← Data Transfer Objects
│   ├── shops.controller.ts        ← HTTP routes
│   ├── shops.service.ts           ← Business logic
│   └── shops.module.ts            ← Module registration
├── users/
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── permissions/
│   ├── dto/
│   ├── permissions.controller.ts
│   ├── permissions.service.ts
│   └── permissions.module.ts
├── product-units/                  ← NEW (Phase 2)
│   ├── dto/
│   ├── product-units.controller.ts
│   ├── product-units.service.ts
│   └── product-units.module.ts
├── products/                       ← NEW (Phase 2)
│   ├── dto/
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── price-comparison/               ← NEW (Phase 2)
│   ├── dto/
│   ├── price-comparison.controller.ts
│   ├── price-comparison.service.ts
│   └── price-comparison.module.ts
├── app.module.ts                   ← Root module
└── main.ts                         ← Entry point
```

---

## Roadmap

| Phase | Feature              | Status       |
|-------|---------------------|--------------|
| 1     | Core Tenancy        | ✅ Complete   |
| 2     | Stock & Inventory   | ✅ Complete   |
| 3     | Sales Transactions  | ✅ Complete   |
| 4     | Daily Balance       | ✅ Complete   |
| 5     | AI Price Agent      | ✅ Complete   |
