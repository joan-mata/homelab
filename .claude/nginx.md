# Nginx — Reverse proxy y routing

## Estructura general

```
Documents/
├── nginx-proxy/          # Reverse proxy central (cv-proxy)
├── cloudflared/          # Túnel Cloudflare
├── infra/                # Servicios base (authelia, postgres, wakeup)
├── .github/workflows/    # GitHub Actions — deploys automáticos
└── <proyecto>/           # Cada app como submódulo git
```

Todo el tráfico entra por Cloudflare → `cloudflared-tunnel` → `cv-proxy` (nginx) → contenedor del servicio.

Configuración de rutas: `nginx-proxy/conf.d/<servicio>.conf`

## Comandos

```bash
# Validar y recargar nginx (sin downtime)
docker exec cv-proxy nginx -t && docker exec cv-proxy nginx -s reload

# O via script
cd nginx-proxy && make reload
```
