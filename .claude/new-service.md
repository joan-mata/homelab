# Añadir nuevo servicio al homelab

1. Crear `<servicio>.conf` en `nginx-proxy/conf.d/` (o usar `./new-service.sh <subdominio> <container> <puerto>`)
2. Añadir entrada en `cloudflared/config.yml`
3. Añadir CNAME en Cloudflare dashboard
4. `git push` → los workflows despliegan automáticamente
5. Si es on-demand: registrar en `infra/wakeup/wakeup.py` + rebuild wakeup (ver `.claude/wakeup.md`)
