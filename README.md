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
- Google Maps / Mapbox (frontend placeholder wired for integration)
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
- User module: profile view/update
- Ride module: full ride state transitions + matching + ETA/surge
- Payment module: M-Pesa STK push initiation and callback handling
- WebSocket module: ride updates + nearby driver broadcasts
- Support module: ticket creation and listing
- Admin module: basic analytics, users and rides listing

## 5) Run Locally

### Option A: Docker Compose
```bash
docker compose up --build
```

### Docker-Only Quickstart (Recommended)
```bash
# 1) Ensure Docker Desktop is running
# 2) From project root:
docker compose up --build -d

# 3) Check status:
docker compose ps

# 4) Open apps:
# Frontend: http://localhost:5173
# Backend API direct (optional): http://localhost:8080/api
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
docker run --name kituirides-postgres -e POSTGRES_DB=kituirides -e POSTGRES_USER=kituirides -e POSTGRES_PASSWORD=kituirides -p 5432:5432 -d postgres:16
docker run --name kituirides-redis -p 6379:6379 -d redis:7

# backend
cd backend
mvn spring-boot:run

# frontend
cd ../frontend
npm install
npm run dev
```

## 6) Key API Prefixes

- `/api/auth`
- `/api/customer`
- `/api/driver`
- `/api/payments`
- `/api/admin`
- `/api/support`
- `/api/locations`

## 7) Initial Admin User Creation

**CRITICAL: On first system launch, the application automatically creates a default superadmin account with the following credentials:**

```
Email: admin@example.com
Password: admin@example.com
First Name: Super
Last Name: Admin
Phone: replace-with-admin-phone
```

**⚠️ IMPORTANT**: Change this password immediately after first login in a production environment.

The superadmin account is created automatically via the `DataInitializer` class when the Spring Boot application starts for the first time. If the superadmin already exists, it will not be recreated.

### Initial Configuration Values

On first startup, the system also creates default admin configuration settings:

| Setting | Default Value | Description |
|---------|---------------|-------------|
| BASE_FARE | 150 KES | Base fare for trip commencement |
| FUEL_COST_PER_LITER | 200 KES | Current fuel cost per liter |
| DRIVER_MARKUP | 1.5 | Driver markup multiplier (150%) |
| COMPANY_COMMISSION_RATE | 0.20 | Company commission rate (20%) |
| MOTORCYCLE_FUEL_ECONOMY | 37 km/L | Motorcycle fuel economy |

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
2. Admin provides support agent with login credentials
3. Support agent can then login and handle support tickets
4. Admin can upgrade support agents to admin role if needed

### Support Agent Workflow

1. Customer/Driver creates support ticket during dispute
2. Support agent is notified
3. Support agent opens chat with involved parties
4. Support agent reviews evidence and makes decision
5. Support agent closes ticket and documents resolution

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
- Map block is intentionally scaffolded in customer page for quick integration of Google Maps or Mapbox SDK next.

### Local PostgreSQL Troubleshooting

If backend fails with `Unable to determine Dialect without JDBC metadata`, JPA could not get DB metadata (usually wrong DB URL/user/password or missing database).

Set datasource explicitly before running backend:

```bash
# PowerShell
$env:DB_URL="jdbc:postgresql://localhost:5432/kituirides"
$env:DB_USERNAME="kituirides"
$env:DB_PASSWORD="kituirides"
mvn spring-boot:run
```

If your local PostgreSQL uses `postgres/postgres`, use:

```bash
# PowerShell
$env:DB_URL="jdbc:postgresql://localhost:5432/kituirides"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgres"
mvn spring-boot:run
```

Create DB/user (run inside `psql` as a superuser):

```sql
CREATE DATABASE kituirides;
CREATE USER kituirides WITH ENCRYPTED PASSWORD 'kituirides';
GRANT ALL PRIVILEGES ON DATABASE kituirides TO kituirides;
```
