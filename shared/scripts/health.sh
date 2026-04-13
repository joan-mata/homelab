#!/usr/bin/env bash
printf "%-30s %s\n" "CONTAINER" "STATUS"
printf "%-30s %s\n" "---------" "------"
for container in cv-proxy cloudflared-tunnel postgres_shared authelia assistant bot_podcasts-n8n-1; do
  state=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not found")
  health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' "$container" 2>/dev/null || echo "-")
  printf "%-30s %-12s %s\n" "$container" "$state" "$health"
done
