#!/bin/bash
set -e

COMPOSE_FILE="docker-compose.proxy.yml"
CONTAINER="cv-proxy"

# ─── colores ───────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

# ─── helpers ───────────────────────────────────────────────────────────────
proxy_running() {
  docker ps --filter "name=^${CONTAINER}$" --filter "status=running" -q | grep -q .
}

validate_nginx() {
  echo "→ Validando config nginx..."
  if ! docker exec "$CONTAINER" nginx -t 2>&1; then
    fail "Config inválida. No se aplican cambios."
  fi
  ok "Config válida"
}

# ─── comandos ──────────────────────────────────────────────────────────────

cmd_reload() {
  # Recarga conf.d sin downtime (para cambios de .conf)
  proxy_running || fail "El contenedor $CONTAINER no está corriendo."
  validate_nginx
  echo "→ Recargando nginx..."
  docker exec "$CONTAINER" nginx -s reload
  ok "Nginx recargado sin downtime"
}

cmd_restart() {
  # Reinicia el contenedor (necesario si cambias docker-compose.proxy.yml)
  warn "Esto reinicia el contenedor. Habrá ~1-2s de downtime."
  proxy_running && validate_nginx
  echo "→ Reiniciando proxy..."
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate cv-proxy
  ok "Proxy reiniciado"
}

cmd_up() {
  # Levanta todos los servicios del proxy (primer arranque o tras apagado)
  echo "→ Levantando proxy stack..."
  docker compose -f "$COMPOSE_FILE" up -d
  ok "Stack levantado"
}

cmd_down() {
  warn "Esto para el proxy. Todas las webs dejarán de responder."
  read -rp "¿Continuar? [s/N] " confirm
  [[ "$confirm" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }
  docker compose -f "$COMPOSE_FILE" down
  ok "Stack parado"
}

cmd_status() {
  docker compose -f "$COMPOSE_FILE" ps
}

cmd_logs() {
  docker compose -f "$COMPOSE_FILE" logs --tail=50 -f
}

cmd_validate() {
  proxy_running || fail "El contenedor $CONTAINER no está corriendo (no se puede validar en seco)."
  validate_nginx
}

# ─── entrypoint ────────────────────────────────────────────────────────────
case "${1:-help}" in
  reload)   cmd_reload ;;
  restart)  cmd_restart ;;
  up)       cmd_up ;;
  down)     cmd_down ;;
  status)   cmd_status ;;
  logs)     cmd_logs ;;
  validate) cmd_validate ;;
  *)
    echo "Uso: $0 <comando>"
    echo ""
    echo "  reload    — recarga conf.d sin downtime (para cambios en .conf)"
    echo "  restart   — recrea el contenedor     (para cambios en docker-compose)"
    echo "  up        — levanta el stack completo"
    echo "  down      — para el stack (pide confirmación)"
    echo "  status    — estado de los contenedores"
    echo "  logs      — logs en tiempo real"
    echo "  validate  — valida nginx config sin aplicar"
    ;;
esac
