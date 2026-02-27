# Bitespeed Identity Reconciliation Service

A backend service that identifies and consolidates customer contact information across multiple purchases on FluxKart.com.

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL 15+
- npm >= 9

### Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd bitespeed

# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Start in development mode
npm run dev
```

### Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run dev`      | Start dev server with hot-reload |
| `npm run build`    | Compile TypeScript to `dist/`    |
| `npm start`        | Run compiled JS (production)     |
| `npm run lint`     | Lint source files                |
| `npm run lint:fix` | Auto-fix lint issues             |
| `npm run format`   | Format code with Prettier        |
| `npm test`         | Run test suite                   |

## API

### `POST /identify`

Consolidates contact information.

**Request body:**

```json
{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```

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

## License

ISC
