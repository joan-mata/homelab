# Homelab — joanmata.com

Servidor macOS con Docker Desktop. Dominio principal: **joanmata.com** vía Cloudflare Tunnel.

---

## Servicios activos

| Subdominio | Proyecto | Descripción | Auth |
|---|---|---|---|
| joanmata.com | `joanmata_web/` | Web personal / CV | No |
| cv.joanmata.com | `Create_CVs/` | Generador de CVs con IA (Ollama) | No |
| refnotes.joanmata.com | `RefereeNotes/` | Notas de árbitro | No |
| f1.joanmata.com | `f1_archive/` | Archivo de F1 | Basic Auth |
| n8n.joanmata.com | `bot_podcasts/` | n8n — workflows y automatizaciones | Authelia |
| auth.joanmata.com | `infra/authelia/` | Portal SSO | — |
| assistant.joanmata.com | `assistant/` | Asistente Telegram (webhook) | Público |

---

## Estructura de directorios

```
~/Documents/
├── shared/              ← Variables y secretos compartidos
│   ├── .env             ← ÚNICA fuente de verdad (nunca commitear)
│   ├── .env.example     ← Plantilla (sí commitear)
│   ├── secrets/         ← Archivos secretos locales (gitignored)
│   └── scripts/
│       ├── setup.sh     ← Primer arranque: red Docker + secretos
│       └── health.sh    ← Estado de todos los containers
│
├── infra/
│   ├── authelia/        ← SSO para subdominios privados
│   └── postgres/        ← PostgreSQL compartido (schemas por proyecto)
│
├── nginx-proxy/         ← nginx (cv-proxy) + cloudflared
│   └── conf.d/
│       ├── joanmata.conf
│       ├── auth.conf, n8n.conf, assistant.conf
│       └── snippets/_authelia.conf
│
├── assistant/           ← Bot Telegram + Claude API tool use
├── bot_podcasts/        ← n8n + workflows de podcasts
├── Create_CVs/          ← App CV con Ollama
├── RefereeNotes/        ← App notas árbitro
├── joanmata_web/        ← Web personal SvelteKit
├── f1_archive/          ← Archivo F1
└── gastia/              ← App de gastos
```

---

## Cómo añadir un nuevo proyecto

1. Crear carpeta en `~/Documents/nombre-proyecto/`
2. En `docker-compose.yml`, añadir:
   ```yaml
   env_file:
     - ../shared/.env
     - .env   # vars locales sobreescriben
   networks:
     - proxy-net
   
   networks:
     proxy-net:
       external: true
       name: proxy-net
   ```
3. Crear `nginx-proxy/conf.d/nombre.conf` con el vhost
4. Si es privado, añadir dentro del `location /`:
   ```nginx
   include conf.d/snippets/_authelia.conf;
   ```
5. Recargar nginx: `docker exec cv-proxy nginx -s reload`

---

## Cómo hablar con el asistente (Telegram)

El asistente entiende lenguaje natural. Ejemplos:

| Lo que dices | Qué hace |
|---|---|
| "Tengo una idea: hacer X" | Nota categoría `idea` |
| "Apunta que tengo que llamar a X" | Tarea pendiente |
| "Recuérdame llamar al médico mañana a las 10" | Recordatorio a las 10:00 del día siguiente |
| "Reunión con Carlos el jueves a las 15h, 1 hora" | Evento en Google Calendar |
| "Guarda la contraseña de GitHub: abc123" | Secreto cifrado AES-256 |
| "¿Qué tareas tengo pendientes?" | Lista de tareas con estado `pending` |
| "Marca como hecha la tarea X" | Actualiza estado a `done` |
| "¿Qué notas tengo?" | Lista las últimas 10 notas |

---

## Cómo obtener GOOGLE_REFRESH_TOKEN

1. Ve a [OAuth2 Playground](https://developers.google.com/oauthplayground)
2. En el engranaje (⚙): marca *Use your own OAuth credentials*, introduce `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
3. Scope: `https://www.googleapis.com/auth/calendar`
4. Paso 1 → autoriza. Paso 2 → *Exchange authorization code for tokens*
5. Copia el `refresh_token` → pégalo en `shared/.env` como `GOOGLE_REFRESH_TOKEN`

---

## Cómo generar el hash de contraseña para Authelia

```bash
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate bcrypt --password 'TU_PASSWORD'
```

Pega el resultado en `infra/authelia/users_database.yml` bajo el campo `password:`.

---

## Comandos de mantenimiento

```bash
# Estado de containers
bash shared/scripts/health.sh

# Recargar nginx tras cambios en conf.d/
docker exec cv-proxy nginx -s reload

# Logs del asistente
docker compose -f assistant/docker-compose.yml logs -f

# Logs de n8n
docker compose -f bot_podcasts/docker-compose.yml logs -f

# Logs de Authelia
docker compose -f infra/authelia/docker-compose.yml logs -f

# Conectar a PostgreSQL compartido
docker exec -it postgres_shared psql -U homelab -d homelab

# Registrar webhook Telegram (ejecutar tras levantar assistant)
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -d "url=https://assistant.joanmata.com/webhook"

# Arrancar toda la infra desde cero
bash shared/scripts/setup.sh
```

---

## Variables que debes rellenar manualmente en shared/.env

Tras ejecutar `setup.sh`, edita `shared/.env` y añade:

```
ANTHROPIC_API_KEY=      # console.anthropic.com
TELEGRAM_BOT_TOKEN=     # @BotFather en Telegram
TELEGRAM_CHAT_ID=       # @userinfobot te da tu chat ID
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=   # Ver sección OAuth2 arriba
```
