#!/bin/bash
# Cloudflare DDNS updater — checks public IP every run, updates DNS record if changed,
# notifies via Telegram. Designed to run via LaunchAgent every 5 minutes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../shared/.env"
LOG_FILE="$SCRIPT_DIR/ddns.log"
IP_CACHE="$SCRIPT_DIR/.last_ip"

MAX_LOG_LINES=500

# ── Load env ──────────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $ENV_FILE not found" >> "$LOG_FILE"
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for VAR in CF_API_TOKEN CF_ZONE_ID CF_DDNS_RECORD TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID; do
    if [[ -z "${!VAR:-}" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $VAR not set in $ENV_FILE" >> "$LOG_FILE"
        exit 1
    fi
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"; }

trim_log() {
    if [[ -f "$LOG_FILE" ]]; then
        local lines
        lines=$(wc -l < "$LOG_FILE")
        if (( lines > MAX_LOG_LINES )); then
            tail -n $MAX_LOG_LINES "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
        fi
    fi
}

telegram_notify() {
    local msg="$1"
    curl -sf -X POST \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "parse_mode=Markdown" \
        --data-urlencode "text=${msg}" > /dev/null 2>&1 || log "WARNING: Telegram notification failed"
}

# ── Get current public IP ─────────────────────────────────────────────────────
CURRENT_IP=""
for SOURCE in "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
    CURRENT_IP=$(curl -sf --max-time 5 "$SOURCE" 2>/dev/null | tr -d '[:space:]')
    [[ "$CURRENT_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && break
    CURRENT_IP=""
done

if [[ -z "$CURRENT_IP" ]]; then
    log "ERROR: Could not get public IP from any source"
    exit 1
fi

# ── Compare with cached IP ────────────────────────────────────────────────────
LAST_IP=""
[[ -f "$IP_CACHE" ]] && LAST_IP=$(cat "$IP_CACHE" | tr -d '[:space:]')

if [[ "$CURRENT_IP" == "$LAST_IP" ]]; then
    log "IP unchanged: $CURRENT_IP"
    trim_log
    exit 0
fi

log "IP changed: '${LAST_IP:-none}' -> '$CURRENT_IP'"

# ── Update Cloudflare DNS record ──────────────────────────────────────────────
CF_BASE="https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records"
CF_AUTH_HEADER="Authorization: Bearer ${CF_API_TOKEN}"

CF_RESPONSE=$(curl -sf -X GET \
    "${CF_BASE}?type=A&name=${CF_DDNS_RECORD}" \
    -H "$CF_AUTH_HEADER" \
    -H "Content-Type: application/json" 2>/dev/null)

if [[ -z "$CF_RESPONSE" ]]; then
    log "ERROR: Cloudflare API unreachable"
    exit 1
fi

SUCCESS=$(echo "$CF_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null)
if [[ "$SUCCESS" != "True" ]]; then
    log "ERROR: Cloudflare API error: $CF_RESPONSE"
    exit 1
fi

RECORD_ID=$(echo "$CF_RESPONSE" | python3 -c "
import sys, json
r = json.load(sys.stdin).get('result', [])
print(r[0]['id'] if r else '')
" 2>/dev/null)

CF_PAYLOAD="{\"type\":\"A\",\"name\":\"${CF_DDNS_RECORD}\",\"content\":\"${CURRENT_IP}\",\"ttl\":60,\"proxied\":false}"

if [[ -z "$RECORD_ID" ]]; then
    # Record doesn't exist yet — create it
    RESULT=$(curl -sf -X POST "$CF_BASE" \
        -H "$CF_AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$CF_PAYLOAD" 2>/dev/null)
    log "Created DNS record ${CF_DDNS_RECORD} -> ${CURRENT_IP}"
else
    # Record exists — update it
    RESULT=$(curl -sf -X PUT "${CF_BASE}/${RECORD_ID}" \
        -H "$CF_AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$CF_PAYLOAD" 2>/dev/null)
    log "Updated DNS record ${CF_DDNS_RECORD} -> ${CURRENT_IP}"
fi

UPDATE_OK=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null)
if [[ "$UPDATE_OK" != "True" ]]; then
    log "ERROR: Failed to update DNS record: $RESULT"
    telegram_notify "❌ *DDNS Error*

No se pudo actualizar \`${CF_DDNS_RECORD}\` en Cloudflare.
IP nueva: \`${CURRENT_IP}\`

Revisa el log: \`infra/ddns/ddns.log\`"
    exit 1
fi

# ── Save new IP ───────────────────────────────────────────────────────────────
echo "$CURRENT_IP" > "$IP_CACHE"

log "Done. ${CF_DDNS_RECORD} -> ${CURRENT_IP}"
trim_log
