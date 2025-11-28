# Copilot Instructions - jf-api-service

## Project Overview
**jf-api-service** is a lightweight Express-based analytics API that tracks blog post visits. It enforces API key authentication, implements duplicate-visit deduplication per IP/minute, and provides time-windowed statistics via PostgreSQL queries.

## Architecture

### Core Components
- **`src/server.ts`** - Express application with two main endpoints:
  - `POST /api/stats/visit` - Records a visit (requires `x-api-key` header)
  - `GET /api/stats/:postId` - Returns stats (total, unique visitors, 7-day/24-hour counts, user's visits)
- **`src/db.ts`** - PostgreSQL connection pool and queries; creates `visits` table on init
- **`src/logger.ts`** - File-based logging to `logs/` (daily rotation pattern: `YYYY-MM-DD.log`, `YYYY-MM-DD-error.log`)
- **`src/types.ts`** - Single `VisitPayload` interface for POST payload

### Key Design Patterns
1. **Deduplication**: `hasRecentVisit()` prevents the same IP from recording multiple visits to the same post within 60 seconds (returns 204 silently on duplicate)
2. **Header precedence**: Client-provided `referrer` and `userAgent` in payload override HTTP headers
3. **IP extraction**: Uses Express's `req.ip` (respects `trust proxy` setting) for visitor tracking
4. **Error isolation**: Global error handlers log exceptions without exposing details to clients

## Development Workflow

### Local Setup
```bash
npm ci
npm run dev  # Start with tsx watch (auto-reload on file changes)
```

### Build & Test
```bash
npm run build       # Compile TypeScript → dist/
npm run check       # Type check without emitting
npm run lint:fix    # Fix ESLint issues (auto-formatted by Prettier)
```

### Docker/Production
```bash
docker-compose up   # Starts api-service + PostgreSQL (port 8001)
npm start           # Production: node dist/server.js
```

### Environment Variables (Required)
- `PORT` - Server port (default: 8001)
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://visits:visits@localhost:5432/visits`)
- `API_KEY` - Secret for `x-api-key` header validation
- `CORS_ORIGIN` - Allowed origin (e.g., `https://jakubferenc.cz`)

## Critical Patterns & Conventions

### Request Validation
- `postId` (string or number), `path` (non-empty string), `postTitle` (non-empty string) are **required**
- `referrer` and `userAgent` are optional; if provided and non-empty, they override HTTP headers
- Invalid requests return `400` with descriptive error messages

### Database
- Schema auto-created in `initDb()` on server startup
- Queries use **parameterized statements** (`$1`, `$2`, etc.) to prevent SQL injection
- Use `Promise.all()` pattern in `GET /api/stats/:postId` for parallel queries (see example)

### Logging
- **Info logs** (`logToFile()`) record request summaries and successful inserts
- **Error logs** (`logError()`) include stack traces and structured error context
- Files are created in `logs/` directory with date-based names

### Error Handling
- Always catch database operations; log errors, then respond with `500` status
- Uncaught exceptions and promise rejections are globally trapped and logged

## Testing & Debugging

### Example Requests
```bash
# Record a visit
curl -X POST http://localhost:8001/api/stats/visit \
  -H "x-api-key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "blog-123",
    "path": "/blog/my-post",
    "postTitle": "My Blog Post",
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0..."
  }'

# Get stats
curl http://localhost:8001/api/stats/blog-123
```

### Common Issues
- **`x-api-key` missing** → 401 Unauthorized
- **Duplicate visit from same IP within 60s** → 204 No Content (logged but not inserted)
- **PostgreSQL connection string invalid** → Server fails to start; check `DATABASE_URL`

## Deployment
- **Docker image**: Node 20 Alpine; uses `pnpm` with frozen lockfile
- **SSH deployment**: `deploy.sh` uses `sshpass`/`rsync` to upload `dist/` to server (requires `.env`: `SSH_USER`, `SSH_PASSWORD`, `SSH_HOST`)
- **Logs persist**: `./logs/` volume mounted in docker-compose for access to daily log files
