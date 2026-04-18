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
- `/api/users`
- `/api/rides`
- `/api/payments`
- `/api/admin`
- `/api/support`
- `/api/locations`

## 7) Notes

- M-Pesa integration is represented by a mock `MpesaClient` adapter in this MVP and can be swapped to real Daraja API calls without changing controller/service contracts.
- Map block is intentionally scaffolded in customer page for quick integration of Google Maps or Mapbox SDK next.
