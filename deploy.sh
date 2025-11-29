#!/usr/bin/env bash
set -euo pipefail

# --- Zjisti adresář skriptu ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Načti .env.ssh ze stejného adresáře jako skript (pouze SSH údaje, lokálně) ---
if [ -f "$SCRIPT_DIR/.env.ssh" ]; then
  # Načteme proměnné z .env.ssh do prostředí
  export $(grep -v '^#' "$SCRIPT_DIR/.env.ssh" | xargs)
else
  echo "❌ Soubor .env.ssh nebyl nalezen. Vytvoř ho ve stejném adresáři jako skript: $SCRIPT_DIR"
  echo "   Do .env.ssh dej jen SSH_USER / SSH_PASSWORD / SSH_HOST a přidej ho do .gitignore a .dockerignore."
  exit 1
fi

# --- Kontrola nutných proměnných pro SSH ---
: "${SSH_USER:?SSH_USER není nastaven v .env.ssh}"
: "${SSH_PASSWORD:?SSH_PASSWORD není nastaven v .env.ssh}"
: "${SSH_HOST:?SSH_HOST není nastaven v .env.ssh}"

# --- Konfigurace ---
SRC_DIR="$SCRIPT_DIR"  # přeneseme celý projekt relativně ke skriptu
DEST_PATH="/www/hosting/jakubferenc.cz/api"

# --- Kontroly ---
if ! command -v sshpass >/dev/null 2>&1; then
  echo "❌ sshpass není nainstalován."
  echo "➡️  Na macOS nainstaluj: brew install hudochenkov/sshpass/sshpass"
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "❌ Adresář $SRC_DIR neexistuje"
  exit 1
fi

echo "🚀 Přenáším obsah $SRC_DIR na ${SSH_USER}@${SSH_HOST}:${DEST_PATH}"
echo "   (vynechávám node_modules, .DS_Store a .env.ssh)"

sshpass -p "$SSH_PASSWORD" rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='**/node_modules/' \
  --exclude='.env.ssh' \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$SRC_DIR"/ \
  "$SSH_USER@$SSH_HOST:$DEST_PATH/"

echo "✅ Hotovo: všechny soubory z $SRC_DIR přeneseny na $DEST_PATH"

# --- Nastavení práv pro .env na serveru (app config, ne SSH) ---
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "🔒 Nastavuji oprávnění pro .env na serveru..."
  sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "chmod 600 '$DEST_PATH/.env' || true"
  echo "✅ .env oprávnění nastaveno"
fi

# --- Info o přenesených souborech ---
if [ -f "$SCRIPT_DIR/package.json" ]; then
  echo "📦 package.json přenesen do $DEST_PATH/package.json"
fi

if [ -f "$SCRIPT_DIR/pnpm-lock.yaml" ]; then
  echo "📦 pnpm-lock.yaml přenesen do $DEST_PATH/pnpm-lock.yaml"
fi

if [ -d "$SCRIPT_DIR/nginx" ]; then
  echo "📡 Nginx složka přenesena do $DEST_PATH/nginx"
fi

if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  echo "📦 docker-compose.yml přeneseno do $DEST_PATH/docker-compose.yml"
fi

if [ -f "$SCRIPT_DIR/Dockerfile" ]; then
  echo "🐳 Dockerfile přenesen do $DEST_PATH/Dockerfile"
fi

# --- Start docker-compose na serveru ---
if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  echo "🚀 Spouštím / restartuji služby pomocí docker-compose na serveru..."
  sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "cd '$DEST_PATH' && docker compose down && docker compose up -d --build"
  echo "✅ Služby spuštěny / restartovány"
fi

echo "🎉 Nasazení dokončeno!"
