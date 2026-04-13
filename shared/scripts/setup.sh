#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

# Docker shared network (already exists, this is a no-op if so)
docker network create proxy-net 2>/dev/null || echo "→ Red proxy-net ya existe"

# Generate shared/.env if missing
if [ ! -f "$ENV_FILE" ]; then
  cp "${ENV_FILE}.example" "$ENV_FILE"
  # macOS: sed -i '' (GNU Linux: sed -i)
  for VAR in POSTGRES_PASSWORD JWT_SECRET AUTHELIA_JWT_SECRET \
             AUTHELIA_SESSION_SECRET AUTHELIA_STORAGE_ENCRYPTION_KEY \
             ASSISTANT_ENCRYPTION_KEY; do
    sed -i '' "s/^${VAR}=.*$/${VAR}=$(openssl rand -hex 32)/" "$ENV_FILE"
  done
  echo "✓ shared/.env generado con secretos aleatorios"
  echo ""
  echo "⚠ Edita shared/.env y añade manualmente:"
  echo "   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID"
  echo "   SPOTIFY_*, CF_*, GOOGLE_*"
  echo "   N8N_WEBHOOK_URL, YOUTUBE_API_KEY, LISTENNOTES_*, PODCASTINDEX_*"
  echo ""
  echo "Para obtener GOOGLE_REFRESH_TOKEN:"
  echo "  https://developers.google.com/oauthplayground"
  echo "  Scope: https://www.googleapis.com/auth/calendar"
  exit 0
fi

# Start base infrastructure in order
echo "Levantando PostgreSQL compartido..."
docker compose -f "${SCRIPT_DIR}/../../infra/postgres/docker-compose.yml" up -d

echo "Levantando Authelia..."
docker compose -f "${SCRIPT_DIR}/../../infra/authelia/docker-compose.yml" up -d

echo ""
echo "✓ Infraestructura base levantada"
echo ""
echo "Siguientes pasos:"
echo "  1. Recargar nginx: docker exec cv-proxy nginx -s reload"
echo "  2. Registrar webhook Telegram:"
echo "     curl -X POST https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/setWebhook \\"
echo "          -d 'url=https://assistant.joanmata.com/webhook'"
