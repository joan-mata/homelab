# Homelab — Guía de operación

## Estructura general

```
Documents/
├── nginx-proxy/          # Reverse proxy central (cv-proxy)
├── cloudflared/          # Túnel Cloudflare
├── infra/                # Servicios base (authelia, postgres, wakeup)
├── .github/workflows/    # GitHub Actions — deploys automáticos
└── <proyecto>/           # Cada app como submódulo git
```

## Reverse proxy y routing

Todo el tráfico entra por Cloudflare → `cloudflared-tunnel` → `cv-proxy` (nginx) → contenedor del servicio.

Configuración de rutas: `nginx-proxy/conf.d/<servicio>.conf`

```bash
# Validar y recargar nginx (sin downtime)
docker exec cv-proxy nginx -t && docker exec cv-proxy nginx -s reload

# O via script
cd nginx-proxy && make reload
```

## GitHub Actions — deploys automáticos

Runner self-hosted: `homelab-mac` (registrado en joan-mata/homelab, corre como LaunchAgent).

| Workflow | Se activa con | Acción |
|----------|--------------|--------|
| `nginx-reload.yml` | cambios en `nginx-proxy/conf.d/**` | `nginx -t` + `nginx -s reload` |
| `nginx-restart.yml` | cambios en `nginx-proxy/docker-compose.proxy.yml` | `nginx -t` + `docker compose up --force-recreate` |
| `cloudflared.yml` | cambios en `cloudflared/config.yml` | `cp config` + `docker restart cloudflared-tunnel` |

Cualquier push con cambios en esos paths despliega automáticamente.

## Servicios on-demand (wakeup)

El servicio `wakeup` (container `wakeup`, puerto 8080) arranca stacks bajo demanda y los para tras inactividad. nginx redirige los 502/503 al wakeup, que muestra una pantalla de carga y levanta el stack.

Registro de servicios: `infra/wakeup/wakeup.py` → dict `SERVICES`.

| Dominio | Stack | Idle |
|---------|-------|------|
| `cv.joanmata.com` | `Create_CVs` | 120 min |
| `refnotes.joanmata.com` | `RefereeNotes` | 120 min |
| `f1.joanmata.com` | `f1_archive` | 120 min |
| `gastia.joanmata.com` | `gastia` | 120 min |
| `biblioteca.joanmata.com` | `biblioteca` | 120 min |
| `podcasts.joanmata.com` | `bot_podcasts` | 120 min |
| `n8n.joanmata.com` | `bot_podcasts` | 120 min |
| `nexum.joanmata.com` | `nexum` | 120 min |
| `trading.joanmata.com` | `bot_trading` (solo dashboard) | 60 min |

Para añadir un servicio on-demand: añadir entrada en `SERVICES`, añadir `include conf.d/snippets/_wakeup.conf` y `error_page 502 503 504 = @wake` en el `.conf` de nginx, rebuild wakeup.

```bash
cd nginx-proxy && docker compose -f docker-compose.proxy.yml build wakeup && docker compose -f docker-compose.proxy.yml up -d wakeup
```

## Bot trading

Los bots corren en `bot-trading-bots` (siempre encendido, `restart: always`). El dashboard es on-demand.

```bash
# Estado
docker ps | grep bot-trading

# Logs bots
docker logs bot-trading-bots -f

# Controlar un bot
docker exec bot-trading-bots python control.py --bot smc_btc pausar
```

Ver `bot_trading/CLAUDE.md` para documentación completa.

## Añadir nuevo servicio al homelab

1. Crear `<servicio>.conf` en `nginx-proxy/conf.d/` (o usar `./new-service.sh <subdominio> <container> <puerto>`)
2. Añadir entrada en `cloudflared/config.yml`
3. Añadir CNAME en Cloudflare dashboard
4. `git push` → los workflows despliegan automáticamente
5. Si es on-demand: registrar en `infra/wakeup/wakeup.py` + rebuild wakeup
