# Bitespeed Identity Reconciliation Service

A backend service that identifies and consolidates customer contact information across multiple purchases on FluxKart.com.

## Tech Stack

| Layer            | Technology       |
| ---------------- | ---------------- |
| Runtime          | Node.js 20+      |
| Language         | TypeScript 5     |
| Framework        | Express.js       |
| ORM              | Prisma 7         |
| Database         | PostgreSQL 16    |
| Validation       | Zod 4            |
| Testing          | Jest + Supertest |
| CI/CD            | GitHub Actions   |
| Containerization | Docker + Compose |
| Hosting          | Render           |

## Project Structure

```
bitespeed/
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed script
├── src/
│   ├── config/                 # Env + DB configuration
│   ├── controllers/            # HTTP request handlers
│   ├── repositories/           # Data access layer
│   ├── routes/                 # Express route definitions
│   ├── services/               # Business logic
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Utilities (logger, errors, normalize)
│   ├── validators/             # Zod validation schemas
│   ├── app.ts                  # Express app setup
│   └── index.ts                # Entry point
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── docker-compose.yml          # Full stack (DB + app)
├── docker-compose.dev.yml      # DB only (for local dev)
├── Dockerfile                  # Multi-stage production build
├── render.yaml                 # Render Blueprint (IaC)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- PostgreSQL 16+ (or Docker)
- npm >= 9

### Option A: Local Development with Docker (recommended)

```bash
# Clone the repo
git clone <your-repo-url>
cd bitespeed

# Start PostgreSQL in Docker
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env with: DATABASE_URL="postgresql://bitespeed:bitespeed_secret@localhost:5432/bitespeed?schema=public"

# Run database migrations
npx prisma migrate dev

# Seed example data (optional)
npx prisma db seed

# Start in development mode (hot-reload)
npm run dev
```

### Option B: Full Docker Stack

```bash
docker compose up --build
```

This starts both PostgreSQL and the app, runs migrations, and exposes port 3000.

### Option C: Native PostgreSQL

```bash
# Install deps
npm install

# Set DATABASE_URL in .env to your local Postgres instance
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Scripts

| Command                    | Description                            |
| -------------------------- | -------------------------------------- |
| `npm run dev`              | Start dev server with hot-reload (tsx) |
| `npm run build`            | Compile TypeScript to `dist/`          |
| `npm start`                | Run compiled JS (production)           |
| `npm run lint`             | Lint source files                      |
| `npm run lint:fix`         | Auto-fix lint issues                   |
| `npm run format`           | Format code with Prettier              |
| `npm test`                 | Run all tests                          |
| `npm run test:unit`        | Run unit tests only                    |
| `npm run test:integration` | Run integration tests (needs DB)       |
| `npm run test:coverage`    | Run tests with coverage report         |
| `npm run prisma:generate`  | Regenerate Prisma client               |
| `npm run prisma:migrate`   | Run Prisma migrations                  |
| `npm run prisma:studio`    | Open Prisma Studio (DB GUI)            |

## API

### `POST /identify`

Consolidates contact information across purchases.

**Request body:**

```json
{
  "email": "string | null",
  "phoneNumber": "string | number | null"
}
```

> At least one of `email` or `phoneNumber` must be provided.

**Response (200):**

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

**Error responses:**

- `400` — Invalid input (missing fields, bad email format)
- `500` — Internal server error

### `GET /health`

Health check endpoint.

```json
{ "status": "ok", "timestamp": "2026-02-27T10:00:00.000Z" }
```

## Deployment (Render)

### Automatic (Blueprint)

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and provisions:
   - A free PostgreSQL database
   - A web service with auto-deploy from `main`/`master`
5. Done! Render runs migrations on every deploy.

### Manual

1. **Create a PostgreSQL database** on Render
2. **Create a Web Service:**
   - **Build command:** `npm ci && npx prisma generate && npm run build`
   - **Start command:** `npx prisma migrate deploy && node dist/index.js`
   - **Environment variables:**
     - `DATABASE_URL` — from your Render database (Internal URL)
     - `NODE_ENV=production`
     - `PORT=3000`

## Design Decisions

| Decision                      | Rationale                                               |
| ----------------------------- | ------------------------------------------------------- |
| **Serializable transactions** | Prevents duplicate contacts from concurrent requests    |
| **PostgreSQL advisory locks** | Keyed on hash(email:phone) for fine-grained concurrency |
| **Email normalization**       | Case-insensitive matching (lowercase + trim)            |
| **Phone normalization**       | Strip non-digits for consistent storage                 |
| **Zod validation**            | Runtime type safety at the API boundary                 |
| **Repository pattern**        | Decouples business logic from data access               |
| **Prisma**                    | Type-safe ORM with excellent migration support          |
| **Multi-stage Docker**        | Minimal production image (~150MB)                       |

## License

ISC

## License

ISC
