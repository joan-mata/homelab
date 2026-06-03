#!/bin/bash
# Uso: ./new-service.sh <subdomain> <container> <port>
# Ejemplo: ./new-service.sh myapp myapp-frontend 3000

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

SUBDOMAIN="${1:-}"
CONTAINER="${2:-}"
PORT="${3:-80}"
DOMAIN="joanmata.com"

[ -z "$SUBDOMAIN" ] && fail "Falta subdomain. Uso: $0 <subdomain> <container> <port>"
[ -z "$CONTAINER" ] && fail "Falta container. Uso: $0 <subdomain> <container> <port>"

CONF_FILE="nginx-proxy/conf.d/${SUBDOMAIN}.conf"
CF_CONFIG="cloudflared/config.yml"
HOSTNAME="${SUBDOMAIN}.${DOMAIN}"

# ── 1. nginx .conf ────────────────────────────────────────────────────────
[ -f "$CONF_FILE" ] && fail "$CONF_FILE ya existe."

info "Creando $CONF_FILE..."
cat > "$CONF_FILE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${HOSTNAME};

    resolver 127.0.0.11 valid=30s ipv6=off;

    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    include conf.d/snippets/_wakeup.conf;

    location / {
        set \$upstream_${SUBDOMAIN} ${CONTAINER};
        proxy_pass http://\$upstream_${SUBDOMAIN}:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        error_page 502 503 504 = @wake;
    }
}
EOF
ok "$CONF_FILE creado"

# ── 2. cloudflared config.yml ─────────────────────────────────────────────
if grep -q "$HOSTNAME" "$CF_CONFIG"; then
  echo -e "${YELLOW}!${NC} $HOSTNAME ya existe en cloudflared/config.yml"
else
  info "Añadiendo $HOSTNAME a cloudflared/config.yml..."
  sed -i '' "s|  # Catch-all|  - hostname: ${HOSTNAME}\n    service: http://cv-proxy:80\n\n  # Catch-all|" "$CF_CONFIG"
  ok "cloudflared/config.yml actualizado"
fi

# ── 3. resumen ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Servicio '${SUBDOMAIN}' listo para desplegar:${NC}"
echo ""
echo "  Archivos creados/modificados:"
echo "    nginx-proxy/conf.d/${SUBDOMAIN}.conf"
echo "    cloudflared/config.yml"
echo ""
echo "  Siguiente paso — recuerda añadir el DNS en Cloudflare dashboard:"
echo "    Tipo CNAME  |  Nombre: ${SUBDOMAIN}  |  Destino: <tunnel-id>.cfargotunnel.com"
echo ""
echo "  Luego haz push para que el workflow lo despliegue:"
echo "    git add nginx-proxy/conf.d/${SUBDOMAIN}.conf cloudflared/config.yml"
echo "    git commit -m 'feat: add ${SUBDOMAIN} service'"
echo "    git push"
echo ""
