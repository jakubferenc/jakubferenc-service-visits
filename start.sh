#!/usr/bin/env bash
set -e

echo "Starting API service with production configuration..."

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "✔ API service is running"
