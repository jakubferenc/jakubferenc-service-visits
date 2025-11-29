#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILES="-f docker-compose.yml -f docker-compose.dev.yml"
HOST_IP="127.0.0.1"
PORT="8001"

echo "🔻 Stopping existing Docker Compose project (if any)..."
docker compose $PROJECT_FILES down --remove-orphans || true

echo "🔨 Building & starting new containers..."
docker compose $PROJECT_FILES up -d --build

echo "🚀 Production stack is UP"
