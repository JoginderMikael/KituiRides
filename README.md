# KituiRides MVP

Production-oriented MVP for a localized ride-hailing platform in Kitui Town, Kenya.

## 1) System Architecture (Text Diagram)

```text
                    +-----------------------------+
                    |         React Web App       |
                    |  (Customer, Rider, Admin)   |
                    +--------------+--------------+
                                   |
                                   | HTTPS (REST) + WebSocket (STOMP)
                                   v
                    +--------------+--------------+
                    |       Spring Boot API       |
                    |-----------------------------|
                    | Auth/JWT + RBAC             |
                    | Ride Orchestration          |
                    | Matching + Surge Logic      |
                    | Payments (M-Pesa adapter)   |
                    | Support Tickets             |
                    | Admin Analytics             |
                    +------+---------------+------+
                           |               |
                     JPA   |               | Cache / fast lookup
                           v               v
                    +------+-----+   +-----+-----+
                    | PostgreSQL |   |   Redis   |
                    +------+-----+   +-----------+
                           |
                           v
                    +------+-----------------------+
                    | Core Tables                  |
                    | users, user_roles            |
                    | rider_profiles, vehicles     |
                    | rides, payments, ratings     |
                    | support_tickets, location... |
                    +------------------------------+

External Integrations:
- M-Pesa Daraja API (currently mocked adapter for MVP)
- Google Maps JavaScript API (customer request map via `VITE_GOOGLE_MAPS_API_KEY`)
```

## 2) Backend Structure

```text
backend/
  src/main/java/com/kituirides/api/
    auth/        -> register/login, DTOs, auth service/controller
    user/        -> profile APIs
    ride/        -> request/accept/start/complete ride flow
    payment/     -> M-Pesa STK push + callback + transaction logs
    location/    -> location pings + nearby drivers
    matching/    -> nearest-driver + surge/ETA logic
    support/     -> ticket system
    admin/       -> dashboard analytics + user/ride listing
    websocket/   -> real-time event publisher + socket controller
    security/    -> JWT service, auth filter, current-user resolver
    config/      -> security, CORS, Redis, WebSocket config
    common/      -> standardized responses + global exception handling
    domain/      -> entities/enums
    repository/  -> JPA repositories
```

## 3) Frontend Structure

```text
frontend/src/
  app/           -> router + tests
  components/    -> app shell + protected route
  features/
    auth/        -> auth API hooks
    rides/       -> ride and payment API hooks
    admin/       -> admin API hooks
    support/     -> support API hooks
  lib/           -> axios client, auth session, websocket connector
  pages/         -> Login/Register/Customer/Driver/Admin/Support
```

## 4) MVP Modules Implemented

- Auth module: JWT + role-based authorization
- User module: profile view/update + bootstrap admin onboarding
- Ride module: strict Phase 3 state machine, nearby-driver broadcast offers, Redis-backed active-ride guards, and real ETA/surge handling
- Payment module: M-Pesa STK push initiation/callback, cash approval flow, commission settlement, and payment-before-completion enforcement
- WebSocket module: ride updates, nearby driver broadcasts, and ride/support chat activity over STOMP + SockJS
- Support module: ride disputes, ride-linked support conversations, support KM override, and hotline lookup via `/api/support/contact`
- Admin module: analytics, users/rides listing, support-agent creation, support phone configuration, and driver edit request visibility

## 5) Run Locally

### Option A: Docker Compose
```bash
cp .env.example .env
# Fill in POSTGRES_PASSWORD, DB_PASSWORD, APP_JWT_SECRET, and any integration keys in .env.
docker compose up --build
```

### Docker-Only Quickstart (Recommended)
```bash
# 1) Ensure Docker Desktop is running
# 2) From project root, create .env from .env.example and fill required values
# 3) Start the stack:
docker compose up --build -d

# 4) Check status:
docker compose ps

# 5) Open apps:
# Frontend: http://localhost:5174
# Backend API direct (optional): http://localhost:4050/api
# Frontend now proxies /api and /ws to backend internally via nginx.
```

Stop and clean:
```bash
docker compose down
```

Stop and also remove database volume (fresh reset):
```bash
docker compose down -v
```

### Option B: Run services individually
```bash
# infrastructure
docker run --name kituirides-postgres -e POSTGRES_DB=kituirides -e POSTGRES_USER=kituirides -e POSTGRES_PASSWORD=replace-with-a-local-password -p 5432:5432 -d postgres:16
docker run --name kituirides-redis -p 6379:6379 -d redis:7

# backend
cd backend
mvn spring-boot:run

# frontend
cd ../frontend
npm install
npm run dev

# local Vite dev runs on:
# http://localhost:5174
```

### Environment

Keep real values in `.env` or `frontend/.env.local`. These files are ignored by Git. Use `.env.example` as the public template.

Required backend values:

```bash
POSTGRES_PASSWORD=replace-with-a-local-postgres-password
DB_PASSWORD=replace-with-a-local-postgres-password
APP_JWT_SECRET=replace-with-at-least-32-random-characters
```

Optional first-run admin bootstrap:

```bash
APP_SUPERADMIN_EMAIL=admin@example.com
APP_SUPERADMIN_PASSWORD=replace-with-a-strong-temporary-password
APP_SUPERADMIN_PHONE=replace-with-admin-phone
```

If `APP_SUPERADMIN_EMAIL` and `APP_SUPERADMIN_PASSWORD` are blank, no admin account is created automatically.

Google Maps is optional for development, but the live request map only appears when the frontend receives an API key.

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# optional when the frontend is not reverse-proxied to the backend
VITE_API_URL=http://localhost:8080/api
```

For Docker builds, the frontend needs the Google Maps key at build time. The current setup supports either of these:

```bash
# Option 1: keep the key in frontend/.env.local
# Option 2: export it in your shell or root .env before docker compose build
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 6) Key API Prefixes

- `/api/auth`
- `/api/customer`
- `/api/driver`
- `/api/payments`
- `/api/admin`
- `/api/support`
- `/api/support/contact`
- `/api/chat`
- `/api/locations`

## Kafka Event Streaming

Kafka is now wired into the backend as an optional domain event bus. It is enabled automatically in Docker Compose through `APP_KAFKA_ENABLED=true`; when running the backend directly, it stays disabled by default so local development still works without a broker.

Published topics:

- `kituirides.ride-events`
- `kituirides.payment-events`
- `kituirides.driver-location-events`
- `kituirides.notification-events`
- `kituirides.support-events`
- `kituirides.analytics-events`

Each topic also has a matching `.DLT` dead-letter topic for messages that still fail after retries.

Useful emitted events include:

- `RIDE_REQUESTED`, `DRIVER_MATCHED`, `DRIVER_ACCEPTED`, `DRIVER_REJECTED`
- `DRIVER_ARRIVED`, `RIDE_STARTED`, `RIDE_CANCELLED`, `RIDE_COMPLETED`
- `PAYMENT_PENDING`, `PAYMENT_INITIATED`, `PAYMENT_SUCCESSFUL`, `PAYMENT_FAILED`, `PAYMENT_COMPLETED`
- `TICKET_CREATED`, `SUPPORT_REPLY`, `TICKET_UPDATED`, `TICKET_CLOSED`
- `DRIVER_FOUND`, `PAYMENT_RECEIVED`, `DRIVER_ONLINE`, `DRIVER_OFFLINE`

Kafka consumers write processed event IDs to `processed_events` so duplicate deliveries are skipped safely.

Run with Kafka locally:

```bash
docker compose up --build
```

To enable Kafka when running the backend outside Docker:

```bash
# PowerShell
$env:APP_KAFKA_ENABLED="true"
$env:KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
cd backend
mvn spring-boot:run
```

## 7) Initial Admin User Creation

The app can create the first admin account on startup only when `APP_SUPERADMIN_EMAIL` and `APP_SUPERADMIN_PASSWORD` are provided in the runtime environment. Leave them blank to skip bootstrap creation.

### Initial Configuration Values

On first startup, the system also creates default admin configuration settings:

| Setting | Default Value | Description |
|---------|---------------|-------------|
| BASE_FARE | 150 KES | Base fare for trip commencement |
| FUEL_COST_PER_LITER | 200 KES | Current fuel cost per liter |
| DRIVER_MARKUP | 1.5 | Driver markup multiplier (150%) |
| COMPANY_COMMISSION_RATE | 0.20 | Company commission rate (20%) |
| MOTORCYCLE_FUEL_ECONOMY | 37 km/L | Motorcycle fuel economy |
| SUPPORT_PHONE_NUMBER | +254797753625 | Support hotline shown to customers, drivers, and support agents |

These can be modified via the admin dashboard at `/api/admin/settings/`.

## 8) User Roles & Permissions

### ADMIN Role
- Full system access
- Can approve/reject driver applications
- Can manage pricing configuration
- Can create and manage support agents
- Can view all users and rides
- Can handle support escalations

### DRIVER Role
- Can request rides
- Can view their wallet and earnings
- Can upload required documents
- Can chat with customers and support agents
- Can request withdrawals

### CUSTOMER Role
- Can request rides
- Can select payment method (M-Pesa or Cash)
- Can chat with drivers
- Can provide ride ratings
- Can contact support

### SUPPORT_AGENT Role
- Can view and handle support tickets
- Can chat with customers and drivers
- **Cannot** perform admin duties
- **Cannot** create their own account (must be created by ADMIN)

## 9) Support Agent Management

Support agents **cannot** create their own accounts. They must be created by an admin:

1. Admin creates support agent account via admin panel
   Admin must set an initial password during account creation
2. Admin provides support agent with login credentials
3. Support agent can then login and handle support tickets
4. Admin can upgrade support agents to admin role if needed

### Support Agent Workflow

1. Customer or driver raises a dispute or support ticket for a ride
2. The ride moves to `DISPUTED` and ride-linked support conversations open for the affected participants
3. Support agent reviews chat context, payment state, and distance evidence
4. Support agent can override final KM, force payment approval when appropriate, and resolve the ride back to `TRIP_CANCELLED`, `PAYMENT_PENDING`, or `PAYMENT_COMPLETED`
5. Driver and customer can also use the configured support hotline for click-to-call escalation

## 10) Driver Account Creation (Two-Step Process)

### Step 1: Driver Registration
- First Name, Last Name
- Email, Phone Number
- Password
- Personal ID verification

### Step 2: Vehicle Information
- Vehicle Type (Car/Motorcycle)
- Vehicle Make & Model
- License Plate Number
- Engine Size (determines fuel economy)
- Vehicle Insurance Details

### Admin Approval
- Admin reviews driver information
- Admin verifies documents
- Admin approves or rejects application
- If approved, driver can start accepting rides

## 11) Notes & PostgreSQL Troubleshooting

- M-Pesa integration is represented by a mock `MpesaClient` adapter in this MVP and can be swapped to real Daraja API calls without changing controller/service contracts.
- The customer dashboard now uses Google Maps for pickup/dropoff selection and nearby-driver visualization when `VITE_GOOGLE_MAPS_API_KEY` is set.
- Payment must complete before a driver can finish a trip. Cash rides require driver approval; M-Pesa rides require a successful callback.
- The strict ride lifecycle used across backend and frontend is:
  `REQUESTED -> DRIVER_ASSIGNED -> DRIVER_ACCEPTED -> DRIVER_ARRIVED -> TRIP_STARTED -> PAYMENT_PENDING -> PAYMENT_COMPLETED -> TRIP_COMPLETED`
- Terminal and dispute states also supported in Phase 3:
  `TRIP_CANCELLED`, `DRIVER_REJECTED`, `DISPUTED`

### Local PostgreSQL Troubleshooting

If backend fails with `Unable to determine Dialect without JDBC metadata`, JPA could not get DB metadata (usually wrong DB URL/user/password or missing database).

Set datasource explicitly before running backend:

```bash
# PowerShell
$env:DB_URL="jdbc:postgresql://localhost:5432/kituirides"
$env:DB_USERNAME="kituirides"
$env:DB_PASSWORD="replace-with-your-local-password"
mvn spring-boot:run
```

If your local PostgreSQL uses a different superuser, use its local credentials:

```bash
# PowerShell
$env:DB_URL="jdbc:postgresql://localhost:5432/kituirides"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="replace-with-your-local-postgres-password"
mvn spring-boot:run
```

Create DB/user (run inside `psql` as a superuser):

```sql
CREATE DATABASE kituirides;
CREATE USER kituirides WITH ENCRYPTED PASSWORD 'replace-with-a-local-password';
GRANT ALL PRIVILEGES ON DATABASE kituirides TO kituirides;
```
