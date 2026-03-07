# POS Bakkal SaaS — Backend Documentation

**Stack:** NestJS · Prisma ORM v6 · PostgreSQL (Aiven Cloud) · JWT Auth
**Deployed on:** Render (backend) · Vercel (frontend)
**GitHub:** https://github.com/arita10/POSBackEnd

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Reference](#5-api-reference)
6. [Business Logic & Formulas](#6-business-logic--formulas)
7. [Environment Variables](#7-environment-variables)
8. [Local Development](#8-local-development)
9. [Deployment](#9-deployment)

---

## 1. System Overview

A multi-tenant SaaS Point-of-Sale backend for Turkish grocery shops (Bakkal).

**One backend — many shops.** Each shop is completely isolated by `shopId`. No shop can see another shop's data.

**Two actor types:**
- **SaaS Admin (you)** — creates shops and owner accounts via `/admin` routes using a secret key
- **Shop Owner / Staff** — logs in with JWT, manages their own shop's data

---

## 2. Architecture

```
src/
├── admin/            → SaaS admin routes (create shops, reset passwords)
├── auth/             → JWT login, guards, decorators
├── shops/            → Shop management
├── users/            → User management per shop
├── permissions/      → Staff permission flags per user
├── product-units/    → Units of measure (Adet, KG, etc.)
├── products/         → Product catalog with stock
├── price-comparison/ → Competitor price tracking
├── sales/            → Sales transactions + stock deduction
├── expenses/         → Business expenses (kasa/devir/kart gider)
├── vendors/          → Reusable vendor list
├── daily-balance/    → End-of-day accounting and reports
├── verisiye/         → Credit customer management
└── prisma/           → PrismaService (global)
```

**Key design decisions:**
- `PrismaModule` is `@Global()` — no need to import in every module
- `JwtAuthGuard` + `RolesGuard` applied globally via `APP_GUARD`
- `@Public()` decorator bypasses JWT (used on login + admin routes)
- `@Roles('OWNER')` / `@Roles('OWNER', 'STAFF')` per route/controller
- All URLs are nested under `/shops/:shopId/...` to enforce tenancy

---

## 3. Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `shops` | One row per tenant shop |
| `users` | Owner + staff per shop |
| `permissions` | Extra flags for staff (canManageStock, canViewReports) |
| `product_units` | Units: Adet, KG, Litre, etc. |
| `products` | Product catalog with stock, cost, sale price |
| `product_price_comparison` | Competitor prices per product |
| `sales_transactions` | Receipt header (cash or credit) |
| `sales_items` | Line items on each receipt |
| `expense_items` | Business expenses by type |
| `vendors` | Reusable vendor names per shop |
| `daily_balance_records` | Closed end-of-day accounting records |
| `verisiye_customers` | Credit customers per shop |
| `verisiye_payments` | Payments made by credit customers |

### Key Column Notes

**products**
- `cost_price` — purchase price (used for profit reports)
- `sale_price` — selling price
- `stock_quantity` — auto-decremented on every sale
- `expiry_date` — optional, for perishables

**sales_transactions**
- `payment_type` — `"nakit"` (cash) or `"verisiye"` (credit)
- `customer_id` — set only when `payment_type = "verisiye"`

**expense_items**
- `expense_type` — `"kasa_gider"` | `"devir_gider"` | `"kart_gider"`
- `vendor_id` — optional link to vendors table

**daily_balance_records**
- Stores the result of the end-of-day close with all formula outputs

**verisiye_customers**
- `is_active` — soft delete flag (history is preserved)
- `tel_no` — unique per shop, used as natural customer key

---

## 4. Authentication & Authorization

### Login Flow

```
POST /auth/login
Body: { "shopId": 1, "username": "ali", "password": "Ali123!" }

Response: { "accessToken": "eyJ..." }
```

All subsequent requests must include:
```
Authorization: Bearer <accessToken>
```

### Role System

| Role | Access |
|------|--------|
| `OWNER` | Full access to all shop routes |
| `STAFF` | Can create sales, view/add verisiye customers and payments |

### Admin Routes

Protected by `x-admin-key` header (not JWT). Value set in `.env` as `ADMIN_KEY`.

```
x-admin-key: your-secret-admin-key
```

---

## 5. API Reference

### AUTH

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/auth/login` | None | `{ shopId, username, password }` |

---

### ADMIN

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/admin/shops` | x-admin-key | `{ shopName, ownerUsername, ownerPassword }` |
| GET | `/admin/shops` | x-admin-key | — |
| POST | `/admin/shops/:shopId/staff` | x-admin-key | `{ username, password }` |
| POST | `/admin/users/:userId/reset-password` | x-admin-key | `{ newPassword }` |

---

### USERS — `/shops/:shopId/users` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/shops/:shopId/users` | `{ username, password, role? }` |
| GET | `/shops/:shopId/users` | — |
| GET | `/shops/:shopId/users/:id` | — |
| PUT | `/shops/:shopId/users/:id` | `{ username?, password?, role? }` |
| DELETE | `/shops/:shopId/users/:id` | — |

---

### PERMISSIONS — `/shops/:shopId/users/:userId/permissions` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/shops/:shopId/users/:userId/permissions` | — |
| PUT | `/shops/:shopId/users/:userId/permissions` | `{ canManageStock?, canViewReports? }` |

---

### PRODUCT UNITS — `/shops/:shopId/product-units` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/shops/:shopId/product-units` | `{ unitName }` |
| GET | `/shops/:shopId/product-units` | — |
| DELETE | `/shops/:shopId/product-units/:id` | — |

> **Note:** Two default units (Adet, KG) are created automatically with every new shop.

---

### PRODUCTS — `/shops/:shopId/products` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/shops/:shopId/products` | `{ unitId, productName, salePrice, costPrice?, barcode?, stockQuantity?, expiryDate? }` |
| GET | `/shops/:shopId/products` | — |
| GET | `/shops/:shopId/products/:id` | — |
| PUT | `/shops/:shopId/products/:id` | `{ productName?, salePrice?, costPrice?, stockQuantity?, barcode?, expiryDate? }` |
| DELETE | `/shops/:shopId/products/:id` | — |

---

### VENDORS — `/shops/:shopId/vendors` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/shops/:shopId/vendors` | — |
| POST | `/shops/:shopId/vendors` | `{ vendorName }` |
| DELETE | `/shops/:shopId/vendors/:id` | — |

---

### SALES — `/shops/:shopId/sales`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/shops/:shopId/sales` | OWNER + STAFF | `{ userId, items: [{productId, quantity}], paymentType?, customerId? }` |
| GET | `/shops/:shopId/sales` | OWNER | — |
| GET | `/shops/:shopId/sales/daily?date=YYYY-MM-DD` | OWNER | — |
| GET | `/shops/:shopId/sales/:id` | OWNER | — |

`paymentType`: `"nakit"` (default) or `"verisiye"` (requires `customerId`)

On every sale: stock is automatically deducted from each product.

---

### EXPENSES — `/shops/:shopId/expenses` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/shops/:shopId/expenses` | `{ vendorName, itemAmount, expenseType, transactionDate?, vendorId? }` |
| GET | `/shops/:shopId/expenses?date=YYYY-MM-DD` | — |
| GET | `/shops/:shopId/expenses/:id` | — |
| PUT | `/shops/:shopId/expenses/:id` | `{ vendorName?, itemAmount?, expenseType?, transactionDate?, vendorId? }` |
| DELETE | `/shops/:shopId/expenses/:id` | — |

**expenseType values:**
- `"kasa_gider"` — cash expense paid from the register
- `"devir_gider"` — carry-over deduction (reduces devir balance)
- `"kart_gider"` — card/bank expense

---

### DAILY BALANCE — `/shops/:shopId/daily-balance` (OWNER only)

| Method | Endpoint | Body / Query |
|--------|----------|------|
| GET | `/shops/:shopId/daily-balance/preview?date=YYYY-MM-DD&dunDevir=0` | — |
| POST | `/shops/:shopId/daily-balance/close` | `{ recordDate, dunDevir?, kasaNakit?, krediler?, verisiye? }` |
| GET | `/shops/:shopId/daily-balance` | — |
| GET | `/shops/:shopId/daily-balance/:id` | — |
| GET | `/shops/:shopId/daily-balance/report?period=daily&date=YYYY-MM-DD` | — |

`period`: `"daily"` | `"weekly"` | `"monthly"`

---

### VERİSİYE — `/shops/:shopId/verisiye`

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/shops/:shopId/verisiye/customers` | OWNER + STAFF | — |
| POST | `/shops/:shopId/verisiye/customers` | OWNER + STAFF | `{ name, telNo, homeNo?, notes? }` |
| GET | `/shops/:shopId/verisiye/customers/:id` | OWNER + STAFF | — |
| GET | `/shops/:shopId/verisiye/customers/:id/detail` | OWNER + STAFF | — |
| PATCH | `/shops/:shopId/verisiye/customers/:id` | OWNER | `{ name?, telNo?, homeNo?, notes? }` |
| DELETE | `/shops/:shopId/verisiye/customers/:id` | OWNER | — (soft delete) |
| POST | `/shops/:shopId/verisiye/payments` | OWNER + STAFF | `{ customerId, amount, recordedBy, paymentDate?, note? }` |

---

### PRICE COMPARISON — `/shops/:shopId/price-comparison` (OWNER only)

| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/shops/:shopId/price-comparison` | — |
| POST | `/shops/:shopId/price-comparison` | `{ productId, competitorName, competitorPrice }` |

---

## 6. Business Logic & Formulas

### Daily Balance Formulas

```
Formula 1 — Devir Kalan:
  devirKalan = dunDevir - totalDevirGider

Formula 2 — Beklenen Kasa (Expected Cash):
  incomeLeft = totalSystemSelling - totalKasaGider - totalKartGider + devirKalan

Formula 3 — Fark (Difference):
  fark = (kasaNakit + krediler + verisiye) - incomeLeft
```

**Field meanings:**
- `dunDevir` — yesterday's carry-over balance (entered manually by owner)
- `totalSystemSelling` — sum of all sales recorded in the system for the day
- `totalKasaGider` — cash expenses paid out of the register
- `totalDevirGider` — carry-over deductions
- `totalKartGider` — card/bank expenses
- `kasaNakit` — actual cash counted in the drawer
- `krediler` — credit card total
- `verisiye` — credit sales total

### Verisiye (Credit) Balance

```
customerBalance = SUM(sales where paymentType='verisiye') - SUM(payments made)
```

Balance is computed dynamically — not stored in the DB.

### Stock Deduction

On every sale, `stockQuantity` is decremented for each product inside a DB transaction. If any product has insufficient stock, the entire sale is rejected.

### Profit Report

```
profit per product = (quantity sold × salePrice) - (quantity sold × costPrice)
```

Available via `GET /shops/:shopId/sales/daily?date=` or the profit report endpoint.

---

## 7. Environment Variables

Create a `.env` file in the root:

```env
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
JWT_SECRET="your-strong-jwt-secret"
ADMIN_KEY="your-strong-admin-key"
PORT=3000
```

**On Render:** set these in the Environment tab of your service (not in the file).

---

## 8. Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Apply DB migrations
npx prisma migrate dev

# Start in watch mode
npm run start:dev
```

Server runs at `http://localhost:3000` by default.

**View DB in browser:**
```bash
npx prisma studio
```

---

## 9. Deployment

### Render Configuration

| Setting | Value |
|---------|-------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Node Version | 20+ |

> `npm run build` runs `prisma generate && nest build` — this ensures the Prisma client is always regenerated from the current schema on every deploy.

### Deploy Steps

1. Push code to `main` branch on GitHub
2. Render auto-detects the push and rebuilds
3. Or: Render dashboard → Manual Deploy → Deploy latest commit

### After Schema Changes

When you change `prisma/schema.prisma`:

```bash
# Run locally first to apply changes to DB
npx prisma migrate dev --name "describe_your_change"

# Then commit and push — Render will regenerate the client automatically
git add prisma/
git commit -m "feat: describe schema change"
git push
```

---

## Appendix — Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Property 'xyz' does not exist on type` | Prisma client not regenerated after schema change | Run `npx prisma generate` or push to trigger Render build |
| `P1017 Server has closed connection` | Aiven idle timeout | Retry the command — it reconnects automatically |
| `P2002 Unique constraint failed` | Duplicate value (e.g. same username, same telNo) | Use a different value |
| `UnknownExportException` | Wrong export in a NestJS module | Export the module, not the service (e.g. `exports: [JwtModule]`) |
| `401 Unauthorized` | Missing or expired JWT | Login again to get a fresh `accessToken` |
| `403 Forbidden` | Route requires OWNER role, logged in as STAFF | Login as the owner account |
