# Build stage
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage (menší image)
FROM node:22-bookworm-slim
WORKDIR /app

# non-root user
RUN useradd -m appuser
USER appuser

# adresář pro DB
RUN mkdir -p /app/data

COPY --chown=appuser:appuser package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build --chown=appuser:appuser /app/dist ./dist

ENV PORT=8080
ENV DB_PATH=/app/data/visits.db
ENV CORS_ORIGIN=*
# ENV API_KEY=some-long-secret

EXPOSE 8080
CMD ["node", "dist/server.js"]