# Merchant Wallet Platform

A backend payment orchestration and wallet platform built with **Node.js, TypeScript, Express, Prisma, and PostgreSQL**.

This project simulates a real-world merchant/customer payment system where:
- merchants can create payment orders,
- customers can pay using **wallet / gateway / hybrid modes**,
- refunds can be processed back to wallet/gateway,
- critical money flows are protected using **idempotency**,
- integration tests and load tests validate correctness and performance.

---

## Features

### Authentication & Roles
- Merchant signup / login
- Customer signup / login
- JWT-based authentication
- Role-based route protection (`merchant` vs `customer`)

### Wallet System
- Auto-created wallet for each customer
- Wallet balance + reserved balance tracking
- Wallet top-up
- Wallet transaction history
- Internal wallet reserve / release / finalize debit flow

### Payment Order System
- Merchant creates payment orders for a customer
- Customer fetches their payment order
- Merchant fetches/list payment orders
- Payment modes:
  - **WALLET**
  - **GATEWAY**
  - **AUTO / HYBRID**
- Payment attempt tracking
- Payment order status updates

### Refund System
- Merchant creates refunds for paid orders
- Supports wallet-paid and gateway-paid refund split
- Refund status tracking
- Merchant refund listing / refund fetch

### Idempotency
Implemented for critical money flows:
- `POST /api/payment-orders/customer/:orderId/pay`
- `POST /api/refunds`

Prevents duplicate processing on retries and detects:
- **same key + same payload** → returns stored response
- **same key + different payload** → returns conflict

### Reliability / Quality
- Integration tests with **Jest + Supertest**
- Load tests with **k6**
- Prisma-based transactional money flow updates

---

# Tech Stack

## Backend
- **Node.js**
- **TypeScript**
- **Express**

## Database / ORM
- **PostgreSQL**
- **Prisma ORM**

## Validation / Auth / Utilities
- **Zod** for request validation
- **JWT** for authentication
- **bcrypt** for password hashing

## Testing
- **Jest**
- **Supertest**

## Load Testing
- **k6**

---

# High-Level Architecture

The project follows a modular backend structure:

- **Auth Module** → merchant/customer signup & login
- **Wallet Module** → wallet fetch, top-up, transactions, reserve/release/debit helpers
- **Payment Module** → payment order creation, pay order flow, gateway orchestration
- **Refund Module** → refund creation and refund listing/fetch
- **Idempotency Layer** → protects critical payment/refund operations
- **Prisma / PostgreSQL** → persistent storage and transactions

---

# Core Business Flows

## 1) Customer Wallet Flow
- customer signs up
- wallet is created automatically
- customer can top up wallet
- wallet transactions are stored

## 2) Merchant Payment Order Flow
- merchant creates payment order for a customer
- customer pays using:
  - wallet only
  - gateway only
  - auto / hybrid split

## 3) Refund Flow
- merchant creates refund for a paid order
- refund amount is split across:
  - wallet refund amount
  - gateway refund amount
- refund is persisted and order refund totals are updated

## 4) Idempotent Money Flow
- repeated payment/refund requests with the same key do **not** create duplicates
- conflicting reuse of the same key is rejected

---

# Project Structure

```bash
merchant-wallet-platform/
├─ prisma/
│  └─ schema.prisma
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  ├─ db.ts
│  │  ├─ env.ts
│  │  └─ logger.ts
│  ├─ common/
│  │  ├─ idempotency/
│  │  ├─ types/
│  │  └─ utils/
│  ├─ middlewares/
│  │  ├─ auth.middleware.ts
│  │  └─ error.middleware.ts
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ wallet/
│  │  ├─ payment/
│  │  └─ refund/
│  └─ routes/
├─ tests/
│  ├─ setup.ts
│  └─ integration/
│     ├─ payment-flow.test.ts
│     └─ wallet-auth.test.ts
├─ k6/
│  ├─ wallet-topup.js
│  └─ payment-flow.js
├─ package.json
├─ tsconfig.json
└─ README.md