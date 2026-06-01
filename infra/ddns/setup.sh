#!/bin/bash
# Installs the DDNS LaunchAgent and runs it immediately.
# Run once: bash infra/ddns/setup.sh

set -euo pipefail

PLIST_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/com.joanmata.ddns.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.joanmata.ddns.plist"
LABEL="com.joanmata.ddns"

echo "Installing DDNS LaunchAgent..."

# Unload if already loaded
launchctl list "$LABEL" &>/dev/null && launchctl unload "$PLIST_DST" 2>/dev/null || true

cp "$PLIST_SRC" "$PLIST_DST"
launchctl load "$PLIST_DST"

echo "LaunchAgent installed and started."
echo "It will run every 5 minutes automatically."
echo ""
echo "Useful commands:"
echo "  Check status:  launchctl list com.joanmata.ddns"
echo "  Run now:       bash infra/ddns/ddns_update.sh"
echo "  View logs:     tail -f infra/ddns/ddns.log"
echo "  Uninstall:     launchctl unload ~/Library/LaunchAgents/com.joanmata.ddns.plist"
