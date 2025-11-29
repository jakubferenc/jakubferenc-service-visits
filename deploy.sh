#!/usr/bin/env bash
set -euo pipefail

# --- Zjisti adresář skriptu ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Načti .env.ssh (jen lokální SSH údaje, nikdy se nenasazují) ---
if [ -f "$SCRIPT_DIR/.env.ssh" ]; then
  export $(grep -v '^#' "$SCRIPT_DIR/.env.ssh" | xargs)
else
  echo "❌ Soubor .env.ssh nebyl nalezen. Vytvoř ho ve stejném adresáři jako skript."
  exit 1
fi

# --- Povinné proměnné ---
: "${SSH_USER:?SSH_USER není nastaven v .env.ssh}"
: "${SSH_PASSWORD:?SSH_PASSWORD není nastaven v .env.ssh}"
: "${SSH_HOST:?SSH_HOST není nastaven v .env.ssh}"

# --- Konfigurace ---
SRC_DIR="$SCRIPT_DIR"
DEST_PATH="/www/hosting/jakubferenc.cz/api"

# --- Kontroly ---
if ! command -v sshpass >/dev/null 2>&1; then
  echo "❌ sshpass není nainstalován."
  echo "➡️  brew install hudochenkov/sshpass/sshpass"
  exit 1
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "❌ Adresář $SRC_DIR neexistuje"
  exit 1
fi

echo "🚀 Přenáším projekt na ${SSH_USER}@${SSH_HOST}:${DEST_PATH}"
echo "   (vynechávám node_modules, .DS_Store, .env.ssh)"

sshpass -p "$SSH_PASSWORD" rsync -avz --delete \
  --exclude='.DS_Store' \
  --exclude='node_modules/' \
  --exclude='**/node_modules/' \
  --exclude='.env.ssh' \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$SRC_DIR"/ \
  "$SSH_USER@$SSH_HOST:$DEST_PATH/"

echo "✅ Soubory přeneseny"

# --- Oprávnění pro .env na serveru ---
if [ -f "$SCRIPT_DIR/.env" ]; then
  echo "🔒 Nastavuji chmod 600 na serveru pro .env..."
  sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" \
    "chmod 600 '$DEST_PATH/.env' || true"
  echo "✅ Nastaveno"
fi

# --- Spuštění start.sh na serveru ---
echo "🚀 Spouštím start.sh na serveru..."

sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no "$SSH_USER@$SSH_HOST" "
  cd '$DEST_PATH' && \
  chmod +x start.sh && \
  ./start.sh
"

echo "🎉 Nasazení dokončeno (start.sh byl úspěšně spuštěn na serveru)"
