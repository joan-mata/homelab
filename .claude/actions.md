# GitHub Actions — Deploys automáticos

Runner self-hosted: `homelab-mac` (registrado en joan-mata/homelab, corre como LaunchAgent).

| Workflow | Se activa con | Acción |
|----------|--------------|--------|
| `nginx-reload.yml` | cambios en `nginx-proxy/conf.d/**` | `nginx -t` + `nginx -s reload` |
| `nginx-restart.yml` | cambios en `nginx-proxy/docker-compose.proxy.yml` | `nginx -t` + `docker compose up --force-recreate` |
| `cloudflared.yml` | cambios en `cloudflared/config.yml` | `cp config` + `docker restart cloudflared-tunnel` |

Cualquier push con cambios en esos paths despliega automáticamente.
