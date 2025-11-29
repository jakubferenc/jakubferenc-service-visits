#!/usr/bin/env bash
set -euo pipefail

PROJECT_FILES="-f docker-compose.yml -f docker-compose.prod.yml"
HOST_IP="127.0.0.1"
PORT="8001"

echo "🔻 Stopping existing Docker Compose project (if any)..."
docker compose $PROJECT_FILES down --remove-orphans || true

echo "🧹 Looking for Docker containers using $HOST_IP:$PORT..."

# Find any Docker containers that have $HOST_IP:$PORT published
CONTAINERS=$(docker ps -a --format '{{.ID}} {{.Ports}}' \
  | awk "/$HOST_IP:$PORT->/ {print \$1}")

if [ -n "${CONTAINERS}" ]; then
  echo "  → Found containers using $HOST_IP:$PORT: $CONTAINERS"
  docker rm -f ${CONTAINERS} || true
else
  echo "  → No Docker containers using $HOST_IP:$PORT"
fi

# Optional: check if some NON-Docker process still uses this port
if command -v ss >/dev/null 2>&1; then
  if ss -ltn "( sport = :$PORT )" | grep -q "$HOST_IP:$PORT"; then
    echo "❌ Port $HOST_IP:$PORT is still in use by a non-Docker process:"
    ss -ltnp "( sport = :$PORT )" || true
    echo "ℹ Uvolni prosím tento port ručně a spusť start.sh znovu."
    exit 1
  fi
fi

echo "🔨 Building & starting new containers..."
docker compose $PROJECT_FILES up -d --build

echo "🚀 Production stack is UP"
