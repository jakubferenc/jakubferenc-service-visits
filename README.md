## Lokální běh

```bash
npm ci
npm run build
PORT=8080 DB_PATH=./data/visits.db CORS_ORIGIN=https://tvoje-domena.cz npm start