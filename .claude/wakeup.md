# Servicios on-demand (wakeup)

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

## Registrar un servicio nuevo

1. Añadir entrada en `SERVICES` en `infra/wakeup/wakeup.py`
2. Añadir `include conf.d/snippets/_wakeup.conf` y `error_page 502 503 504 = @wake` en el `.conf` de nginx
3. Rebuild wakeup:

```bash
cd nginx-proxy && docker compose -f docker-compose.proxy.yml build wakeup && docker compose -f docker-compose.proxy.yml up -d wakeup
```
