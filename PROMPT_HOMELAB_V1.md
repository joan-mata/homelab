# PROMPT HOMELAB V1 — infraestructura base + asistente personal
# Ejecutar desde ~/Documents/: claude "lee PROMPT_HOMELAB_V1.md y ejecuta"

---

## CONTEXT

Servidor macOS personal (Darwin 22.6.0) con Docker Desktop.
Dominio principal: joanmata.com (y subdominios vía Cloudflare Tunnel).
Stack existente: nginx-proxy/ (nginx + cloudflared) + varios proyectos Docker en ~/Documents/.
Red Docker compartida existente: `proxy-net`.
Objetivo: seguridad centralizada, capa shared de configuración, asistente personal via Telegram.

### Proyectos existentes (NO tocar estructura interna):
- `bot_podcasts/`   — n8n + workflows de podcasts. Redes: internal + proxy-net
- `Create_CVs/`     — Postgres + backend (Ollama) + frontend. Red propia sin proxy-net
- `RefereeNotes/`   — Postgres + backend + frontend. Redes: refnotes-internal + proxy-net
- `joanmata_web/`   — SvelteKit CV web. Red: joanmata-web (external), puerto 4173:3000
- `f1_archive/`     — Postgres + PostgREST + backend + web + proxy. Redes: f1-network + proxy-net
- `gastia/`         — App de gastos (sin docker-compose aún). Variables en .env
- `nginx-proxy/`    — nginx (container: cv-proxy) + cloudflared. Red: proxy-net (80/443)

Lee TODOS los archivos de cada proyecto antes de tocar nada:
- docker-compose.yml de cada servicio
- .env.example de cada servicio
- Cualquier AGENT.md o README.md existente

## LANGUAGE RULES
- Code, keys, variables, nombres de servicio → English
- Contenido user-facing (mensajes bot, README, docs) → Spanish
- Comentarios en código → English

## TOKEN EFFICIENCY
Estilo telegráfico en prompts y docs. Sin relleno.

---

## PART 1 — ESTRUCTURA DE DIRECTORIOS

```
~/Documents/
├── shared/
│   ├── .env                        ← ÚNICA fuente de vars compartidas (nunca commitear)
│   ├── .env.example                ← Plantilla completa (sí commitear)
│   ├── secrets/
│   │   └── .gitignore              ← ignorar todo
│   └── scripts/
│       ├── setup.sh
│       └── health.sh
│
├── infra/
│   ├── authelia/
│   │   ├── docker-compose.yml
│   │   ├── configuration.yml
│   │   └── users_database.yml
│   ├── postgres/
│   │   ├── docker-compose.yml
│   │   └── init/
│   │       └── 00_schemas.sql
│   └── README.md
│
├── nginx-proxy/                    ← EXISTENTE — solo añadir conf.d/
│   ├── docker-compose.proxy.yml   ← EXISTENTE — no modificar
│   └── conf.d/
│       ├── joanmata.conf          ← EXISTENTE
│       ├── _authelia.conf         ← NUEVO — include en vhosts privados
│       ├── auth.conf              ← NUEVO — vhost auth.joanmata.com
│       ├── n8n.conf               ← NUEVO — vhost n8n.joanmata.com
│       └── assistant.conf         ← NUEVO — vhost assistant.joanmata.com
│
├── assistant/
│   ├── docker-compose.yml
│   ├── agent/
│   │   ├── server.js               ← Express: recibe webhook Telegram, llama Claude API
│   │   ├── tools.js                ← definición de herramientas para Claude
│   │   ├── tool_handlers.js        ← implementación de cada herramienta
│   │   ├── Dockerfile
│   │   └── package.json
│   └── prompts/
│       └── system.md               ← system prompt del agente
│
├── bot_podcasts/                   ← existente, sin cambios estructurales
├── Create_CVs/                     ← existente, sin cambios estructurales
├── RefereeNotes/                   ← existente, sin cambios estructurales
├── joanmata_web/                   ← existente, sin cambios estructurales
├── f1_archive/                     ← existente, sin cambios estructurales
└── gastia/                         ← existente, sin cambios estructurales
```

### Regla de variables compartidas

`shared/.env.example` contiene TODAS las variables usadas por ≥2 proyectos:

```env
# ── APIs compartidas ──────────────────────────────────────
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=              # Bot del asistente personal (assistant/)
TELEGRAM_CHAT_ID=                # Tu chat ID personal (@userinfobot)
CF_API_TOKEN=
CF_ZONE_ID=

# ── Spotify (bot_podcasts) ────────────────────────────────
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback

# ── YouTube / Podcasts (bot_podcasts) ────────────────────
YOUTUBE_API_KEY=
LISTENNOTES_API_KEY=
PODCASTINDEX_API_KEY=
PODCASTINDEX_API_SECRET=

# ── Apple Calendar CalDAV (bot_podcasts) ─────────────────
APPLE_CALDAV_URL=https://caldav.icloud.com
APPLE_CALDAV_USER=
APPLE_CALDAV_PASSWORD=
APPLE_CALENDAR_NAME=Personal

# ── n8n (bot_podcasts) ───────────────────────────────────
N8N_HOST=localhost
N8N_PORT=5678
N8N_WEBHOOK_URL=                 # https://n8n.joanmata.com
N8N_API_KEY=                     # Generar en n8n UI → Settings → API

# ── PostgreSQL compartido (infra/postgres) ────────────────
POSTGRES_HOST=postgres_shared
POSTGRES_PORT=5432
POSTGRES_DB=homelab
POSTGRES_USER=homelab
POSTGRES_PASSWORD=

# ── Seguridad ─────────────────────────────────────────────
JWT_SECRET=
AUTHELIA_JWT_SECRET=
AUTHELIA_SESSION_SECRET=
AUTHELIA_STORAGE_ENCRYPTION_KEY=

# ── Asistente ─────────────────────────────────────────────
ASSISTANT_ENCRYPTION_KEY=        # AES-256 para secretos: openssl rand -hex 32
DOMAIN=joanmata.com

# ── Google Calendar OAuth2 ────────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=            # Obtener via OAuth2 Playground
GOOGLE_CALENDAR_ID=primary

# ── SMTP (opcional) ───────────────────────────────────────
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_TO=
```

Cada proyecto que necesite vars compartidas:
```yaml
env_file:
  - ../shared/.env
  - .env          # vars locales sobreescriben si hay conflicto
```

**Nota macOS**: `sed -i ''` en lugar de `sed -i` en scripts bash.

---

## PART 2 — SEGURIDAD: AUTHELIA SSO

Una sola sesión para todos los subdominios privados.

### infra/authelia/docker-compose.yml

```yaml
services:
  authelia:
    image: authelia/authelia:latest
    container_name: authelia
    restart: unless-stopped
    volumes:
      - ./configuration.yml:/config/configuration.yml:ro
      - ./users_database.yml:/config/users_database.yml
      - authelia_data:/config/db.sqlite3
    environment:
      AUTHELIA_JWT_SECRET: ${AUTHELIA_JWT_SECRET}
      AUTHELIA_SESSION_SECRET: ${AUTHELIA_SESSION_SECRET}
      AUTHELIA_STORAGE_ENCRYPTION_KEY: ${AUTHELIA_STORAGE_ENCRYPTION_KEY}
    env_file:
      - ../../shared/.env
    networks:
      - proxy-net
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:9091/api/health"]
      interval: 30s
      retries: 3

volumes:
  authelia_data:

networks:
  proxy-net:
    external: true
    name: proxy-net
```

### infra/authelia/configuration.yml

```yaml
theme: dark

server:
  host: 0.0.0.0
  port: 9091

log:
  level: warn

authentication_backend:
  file:
    path: /config/users_database.yml
    password:
      algorithm: bcrypt
      iterations: 12

session:
  name: authelia_session
  domain: joanmata.com
  expiration: 12h
  inactivity: 45m

storage:
  local:
    path: /config/db.sqlite3

notifier:
  filesystem:
    filename: /config/notification.txt

access_control:
  default_policy: deny
  rules:
    - domain: "joanmata.com"
      policy: bypass
    - domain: "*.joanmata.com"
      policy: one_factor
```

### nginx-proxy/conf.d/_authelia.conf (NUEVO)

```nginx
auth_request /authelia;
auth_request_set $target_url $scheme://$http_host$request_uri;
error_page 401 =302 https://auth.joanmata.com/?rd=$target_url;

location = /authelia {
    internal;
    proxy_pass http://authelia:9091/api/verify;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
    proxy_set_header X-Original-URL    $scheme://$http_host$request_uri;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host  $http_host;
    proxy_set_header X-Forwarded-Uri   $request_uri;
    proxy_set_header X-Forwarded-For   $remote_addr;
}
```

### nginx-proxy/conf.d/auth.conf (NUEVO)

```nginx
server {
    listen 80;
    server_name auth.joanmata.com;

    location / {
        proxy_pass http://authelia:9091;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Añadir `include conf.d/_authelia.conf;` dentro del `location /` de cada vhost privado.

---

## PART 3 — POSTGRESQL COMPARTIDO

### infra/postgres/docker-compose.yml

```yaml
services:
  postgres_shared:
    image: postgres:16-alpine
    container_name: postgres_shared
    user: "999:999"
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    env_file:
      - ../../shared/.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init/:/docker-entrypoint-initdb.d/:ro
    networks:
      - proxy-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      retries: 5

volumes:
  postgres_data:

networks:
  proxy-net:
    external: true
    name: proxy-net
```

### infra/postgres/init/00_schemas.sql

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Schema por proyecto (cada uno aislado)
CREATE SCHEMA IF NOT EXISTS assistant;
CREATE SCHEMA IF NOT EXISTS podcasts;

-- ── Assistant ─────────────────────────────────────────────

CREATE TABLE assistant.notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  category    TEXT DEFAULT 'general',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assistant.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  priority    TEXT DEFAULT 'media' CHECK (priority IN ('alta','media','baja')),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  done_at     TIMESTAMPTZ
);

CREATE TABLE assistant.reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text        TEXT NOT NULL,
  remind_at   TIMESTAMPTZ NOT NULL,
  sent        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- value_encrypted: AES-256-GCM cifrado ANTES de insertar, nunca en claro
CREATE TABLE assistant.secrets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service          TEXT NOT NULL,
  username         TEXT,
  value_encrypted  TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_pending
  ON assistant.reminders (remind_at)
  WHERE sent = FALSE;
```

---

## PART 4 — ASISTENTE PERSONAL (Telegram + Claude API tool use)

### Arquitectura

```
Telegram → webhook → assistant/agent/server.js
                          │
                          ├─ construye messages[] con historial
                          ├─ llama Claude API (model + tools)
                          │
                          └─ Claude responde con tool_use block
                                    │
                                    ├─ create_note      → INSERT assistant.notes
                                    ├─ create_task      → INSERT/UPDATE assistant.tasks
                                    ├─ create_reminder  → INSERT assistant.reminders
                                    ├─ create_calendar_event → Google Calendar API
                                    ├─ save_secret      → AES-encrypt → INSERT assistant.secrets
                                    ├─ list_items       → SELECT según tipo
                                    └─ update_task      → UPDATE assistant.tasks

                          resultado → respuesta Telegram al usuario
```

No hay clasificador previo. Claude recibe el mensaje y decide directamente qué herramienta
usar (o ninguna, si es una pregunta). El bucle en server.js permite encadenar herramientas
en un mismo turno si Claude lo necesita.

### assistant/agent/tools.js

```js
const TOOLS = [
  {
    name: "create_note",
    description: "Guarda una nota o idea del usuario. Usar cuando el usuario quiere apuntar algo para recordar más tarde, o comparte una idea.",
    input_schema: {
      type: "object",
      properties: {
        text:     { type: "string", description: "Texto completo de la nota" },
        category: { type: "string", enum: ["general", "idea", "importante"] }
      },
      required: ["text"]
    }
  },
  {
    name: "create_task",
    description: "Crea una tarea pendiente. Usar cuando el usuario menciona algo que tiene que hacer, gestionar o completar.",
    input_schema: {
      type: "object",
      properties: {
        text:     { type: "string", description: "Descripción de la tarea" },
        priority: { type: "string", enum: ["alta", "media", "baja"] }
      },
      required: ["text"]
    }
  },
  {
    name: "create_reminder",
    description: "Crea un recordatorio con fecha y hora. Usar cuando el usuario quiere que se le recuerde algo en un momento concreto.",
    input_schema: {
      type: "object",
      properties: {
        text:      { type: "string", description: "Qué recordar" },
        remind_at: { type: "string", description: "Fecha y hora en ISO 8601, ej: 2025-04-16T09:00:00+02:00" }
      },
      required: ["text", "remind_at"]
    }
  },
  {
    name: "create_calendar_event",
    description: "Crea un evento en Google Calendar. Usar cuando el usuario menciona una reunión, cita, evento o compromiso con fecha y hora.",
    input_schema: {
      type: "object",
      properties: {
        title:            { type: "string" },
        datetime:         { type: "string", description: "ISO 8601 con timezone" },
        duration_minutes: { type: "integer", default: 60 },
        description:      { type: "string" }
      },
      required: ["title", "datetime"]
    }
  },
  {
    name: "save_secret",
    description: "Guarda una credencial o contraseña de forma segura. Usar solo cuando el usuario quiere guardar explícitamente una contraseña o credencial.",
    input_schema: {
      type: "object",
      properties: {
        service:  { type: "string", description: "Nombre del servicio (ej: Netflix, GitHub)" },
        username: { type: "string" },
        password: { type: "string", description: "Contraseña en claro — se cifrará antes de guardar" }
      },
      required: ["service", "password"]
    }
  },
  {
    name: "list_items",
    description: "Consulta notas, tareas, recordatorios o secretos guardados.",
    input_schema: {
      type: "object",
      properties: {
        type:   { type: "string", enum: ["notes", "tasks", "reminders", "secrets"] },
        status: { type: "string", enum: ["pending", "done"], description: "Solo para tasks" },
        limit:  { type: "integer", default: 10 }
      },
      required: ["type"]
    }
  },
  {
    name: "update_task",
    description: "Marca una tarea como completada o cancelada.",
    input_schema: {
      type: "object",
      properties: {
        id:     { type: "string", description: "UUID de la tarea" },
        status: { type: "string", enum: ["done", "cancelled"] }
      },
      required: ["id", "status"]
    }
  }
];

module.exports = { TOOLS };
```

### assistant/agent/server.js

```js
const express = require('express');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { TOOLS } = require('./tools');
const toolHandlers = require('./tool_handlers');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const pool = new Pool({
  host:     process.env.POSTGRES_HOST,
  port:     process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, '../prompts/system.md'), 'utf8'
);

// In-memory conversation history per chat_id
const conversations = {};
const MAX_HISTORY = 20;

async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respond immediately to Telegram

  const msg = req.body?.message;
  if (!msg?.text) return;

  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!conversations[chatId]) conversations[chatId] = [];
  conversations[chatId].push({ role: 'user', content: userText });
  if (conversations[chatId].length > MAX_HISTORY) {
    conversations[chatId] = conversations[chatId].slice(-MAX_HISTORY);
  }

  const systemWithDate = SYSTEM_PROMPT.replace(
    '{{CURRENT_DATETIME}}',
    new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  );

  try {
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemWithDate,
      tools: TOOLS,
      messages: conversations[chatId]
    });

    // Tool use loop: Claude can chain tools in one turn
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const block of toolUseBlocks) {
        const handler = toolHandlers[block.name];
        let result;
        try {
          result = handler
            ? await handler(block.input, pool)
            : { error: `Herramienta desconocida: ${block.name}` };
        } catch (err) {
          result = { error: err.message };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result)
        });
      }

      conversations[chatId].push({ role: 'assistant', content: response.content });
      conversations[chatId].push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemWithDate,
        tools: TOOLS,
        messages: conversations[chatId]
      });
    }

    const finalText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    conversations[chatId].push({ role: 'assistant', content: response.content });

    await sendTelegram(chatId, finalText);

  } catch (err) {
    console.error('Error:', err);
    await sendTelegram(chatId, 'Ha ocurrido un error. Inténtalo de nuevo.');
  }
});

app.listen(3001, () => console.log('Assistant agent listening on :3001'));
```

### assistant/agent/tool_handlers.js

```js
const crypto = require('crypto');

const ENC_KEY = Buffer.from(process.env.ASSISTANT_ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

module.exports = {
  async create_note({ text, category = 'general' }, pool) {
    const { rows } = await pool.query(
      'INSERT INTO assistant.notes (text, category) VALUES ($1, $2) RETURNING id, created_at',
      [text, category]
    );
    return { ok: true, id: rows[0].id, created_at: rows[0].created_at };
  },

  async create_task({ text, priority = 'media' }, pool) {
    const { rows } = await pool.query(
      'INSERT INTO assistant.tasks (text, priority) VALUES ($1, $2) RETURNING id',
      [text, priority]
    );
    return { ok: true, id: rows[0].id };
  },

  async create_reminder({ text, remind_at }, pool) {
    const { rows } = await pool.query(
      'INSERT INTO assistant.reminders (text, remind_at) VALUES ($1, $2) RETURNING id',
      [text, remind_at]
    );
    return { ok: true, id: rows[0].id, remind_at };
  },

  async create_calendar_event({ title, datetime, duration_minutes = 60, description = '' }, pool) {
    const { google } = require('googleapis');
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const calendar = google.calendar({ version: 'v3', auth });

    const start = new Date(datetime);
    const end = new Date(start.getTime() + duration_minutes * 60000);

    const { data } = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone: 'Europe/Madrid' },
        end:   { dateTime: end.toISOString(),   timeZone: 'Europe/Madrid' }
      }
    });
    return { ok: true, event_id: data.id, html_link: data.htmlLink };
  },

  async save_secret({ service, username = '', password }, pool) {
    const encrypted = encrypt(password);
    await pool.query(
      'INSERT INTO assistant.secrets (service, username, value_encrypted) VALUES ($1, $2, $3)',
      [service, username, encrypted]
    );
    return { ok: true, service };
  },

  async list_items({ type, status, limit = 10 }, pool) {
    const queries = {
      notes:     'SELECT id, text, category, created_at FROM assistant.notes ORDER BY created_at DESC LIMIT $1',
      tasks:     status
                   ? 'SELECT id, text, priority, status, created_at FROM assistant.tasks WHERE status=$2 ORDER BY created_at DESC LIMIT $1'
                   : 'SELECT id, text, priority, status, created_at FROM assistant.tasks ORDER BY created_at DESC LIMIT $1',
      reminders: 'SELECT id, text, remind_at, sent FROM assistant.reminders WHERE sent=FALSE ORDER BY remind_at ASC LIMIT $1',
      secrets:   'SELECT id, service, username, created_at FROM assistant.secrets ORDER BY created_at DESC LIMIT $1'
    };
    const params = status && type === 'tasks' ? [limit, status] : [limit];
    const { rows } = await pool.query(queries[type], params);
    return { items: rows };
  },

  async update_task({ id, status }, pool) {
    const done_at = status === 'done' ? new Date().toISOString() : null;
    await pool.query(
      'UPDATE assistant.tasks SET status=$1, done_at=$2 WHERE id=$3',
      [status, done_at, id]
    );
    return { ok: true };
  }
};
```

### assistant/agent/package.json

```json
{
  "name": "assistant-agent",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "express": "^4.18.0",
    "googleapis": "^140.0.0",
    "pg": "^8.11.0"
  }
}
```

### assistant/agent/Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
USER node
CMD ["node", "server.js"]
```

### assistant/prompts/system.md

```
Eres el asistente personal de Joan. Respondes siempre en español, directo y sin florituras.

Tienes herramientas para gestionar notas, tareas, recordatorios, eventos de calendario y credenciales.

Reglas:
- Usa las herramientas cuando la intención sea clara. No pidas confirmación para notas, tareas ni recordatorios simples.
- Para eventos de calendario: si falta la hora, pregunta antes de crear.
- Para contraseñas: solo guarda cuando el usuario lo pida explícitamente. Confirma antes de guardar.
- Si el usuario pregunta algo que no requiere herramienta, responde directamente.
- Fechas relativas ("mañana", "el jueves", "en una hora"): resuélvelas respecto a la fecha actual en Europe/Madrid.
- Respuestas cortas. Confirma la acción en una línea. Sin markdown innecesario.

Fecha y hora actual: {{CURRENT_DATETIME}}
```

### assistant/docker-compose.yml

```yaml
services:
  assistant:
    build: ./agent
    container_name: assistant
    restart: unless-stopped
    env_file:
      - ../shared/.env
    depends_on:
      postgres_shared:
        condition: service_healthy
    networks:
      - proxy-net

networks:
  proxy-net:
    external: true
    name: proxy-net
```

### nginx-proxy/conf.d/n8n.conf (NUEVO)

```nginx
server {
    listen 80;
    server_name n8n.joanmata.com;

    access_log /var/log/nginx/n8n_access.log;
    error_log  /var/log/nginx/n8n_error.log;

    location / {
        include conf.d/_authelia.conf;

        set $upstream_n8n n8n;
        proxy_pass         http://$upstream_n8n:5678;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
    }
}
```

### nginx-proxy/conf.d/assistant.conf (NUEVO)

```nginx
server {
    listen 80;
    server_name assistant.joanmata.com;

    access_log /var/log/nginx/assistant_access.log;
    error_log  /var/log/nginx/assistant_error.log;

    location /webhook {
        # Webhook público — Telegram necesita acceso sin auth
        set $upstream_assistant assistant;
        proxy_pass         http://$upstream_assistant:3001;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## PART 5 — SCRIPTS

### shared/scripts/setup.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"

# Docker shared network
docker network create proxy-net 2>/dev/null || echo "→ Red proxy-net ya existe"

# Generate shared/.env if missing
if [ ! -f "$ENV_FILE" ]; then
  cp "${ENV_FILE}.example" "$ENV_FILE"
  # macOS: sed -i '' (GNU Linux: sed -i)
  for VAR in POSTGRES_PASSWORD JWT_SECRET AUTHELIA_JWT_SECRET \
             AUTHELIA_SESSION_SECRET AUTHELIA_STORAGE_ENCRYPTION_KEY \
             ASSISTANT_ENCRYPTION_KEY; do
    sed -i '' "s/^${VAR}=\$/${VAR}=$(openssl rand -hex 32)/" "$ENV_FILE"
  done
  echo "✓ shared/.env generado con secretos aleatorios"
  echo ""
  echo "⚠ Edita shared/.env y añade manualmente:"
  echo "   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, SPOTIFY_*, CF_*, GOOGLE_*"
  echo "   N8N_WEBHOOK_URL, YOUTUBE_API_KEY, LISTENNOTES_*, PODCASTINDEX_*"
  echo ""
  echo "Para obtener GOOGLE_REFRESH_TOKEN:"
  echo "  https://developers.google.com/oauthplayground"
  echo "  Scope: https://www.googleapis.com/auth/calendar"
  exit 0
fi

# Start base infrastructure in order
echo "Levantando PostgreSQL compartido..."
docker compose -f "${SCRIPT_DIR}/../../infra/postgres/docker-compose.yml" up -d

echo "Levantando Authelia..."
docker compose -f "${SCRIPT_DIR}/../../infra/authelia/docker-compose.yml" up -d

echo ""
echo "✓ Infraestructura base levantada"
echo ""
echo "Siguientes pasos:"
echo "  1. Añadir _authelia.conf en nginx-proxy/conf.d/ para vhosts privados"
echo "  2. Recargar nginx: docker exec cv-proxy nginx -s reload"
echo "  3. Registrar webhook Telegram:"
echo "     curl -X POST https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/setWebhook \\"
echo "          -d 'url=https://assistant.joanmata.com/webhook'"
```

### shared/scripts/health.sh

```bash
#!/usr/bin/env bash
printf "%-30s %s\n" "CONTAINER" "STATUS"
printf "%-30s %s\n" "---------" "------"
for container in cv-proxy cloudflared-tunnel postgres_shared authelia assistant n8n; do
  status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null \
           || docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null \
           || echo "not found")
  printf "%-30s %s\n" "$container" "$status"
done
```

---

## PART 6 — README.md (~/Documents/)

Crear `~/Documents/README.md` en Spanish con estas secciones:

1. Tabla de servicios activos:

| Subdominio | Proyecto | Descripción | Auth |
|---|---|---|---|
| joanmata.com | joanmata_web | Web personal / CV | No |
| cv.joanmata.com | Create_CVs | Generador de CVs con IA (Ollama) | No |
| refnotes.joanmata.com | RefereeNotes | Notas de árbitro | No |
| f1.joanmata.com | f1_archive | Archivo de F1 | Basic Auth |
| n8n.joanmata.com | bot_podcasts | n8n workflows | Authelia |
| auth.joanmata.com | infra/authelia | SSO portal | — |
| assistant.joanmata.com | assistant | Asistente Telegram | Webhook público |

2. Estructura de directorios (árbol resumido)
3. Cómo añadir un nuevo proyecto (5 pasos: crear carpeta, env_file shared, network proxy-net, nginx vhost en nginx-proxy/conf.d/, authelia si es privado)
4. Cómo hablar con el asistente — ejemplos de mensajes naturales:
   - "Tengo una idea: hacer X" → nota categoría idea
   - "Recuérdame llamar al médico mañana a las 10" → recordatorio
   - "Reunión con Carlos el jueves a las 15h, 1 hora" → evento calendario
   - "Guarda la contraseña de GitHub: abc123" → secreto cifrado
   - "¿Qué tareas tengo pendientes?" → lista tareas
5. Cómo obtener GOOGLE_REFRESH_TOKEN (enlace OAuth2 Playground + scope necesario)
6. Comandos de mantenimiento:
   - Ver estado: shared/scripts/health.sh
   - Recargar Nginx: docker exec cv-proxy nginx -s reload
   - Logs asistente: docker compose -f assistant/docker-compose.yml logs -f
   - Logs n8n: docker compose -f bot_podcasts/docker-compose.yml logs -f
   - Registrar webhook Telegram (comando curl completo)

---

## EXECUTION ORDER

1. Leer TODOS los docker-compose.yml y .env existentes en ~/Documents/
2. Crear `shared/.env.example` consolidando vars de todos los proyectos existentes
3. Ejecutar `shared/scripts/setup.sh` → crea red Docker proxy-net (si no existe) + genera secretos en shared/.env
4. Editar shared/.env: añadir ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, SPOTIFY_*, CF_*, GOOGLE_*, N8N vars
5. Levantar PostgreSQL compartido → aplicar 00_schemas.sql automáticamente via init/
6. Levantar Authelia
7. Crear nginx-proxy/conf.d/_authelia.conf + auth.conf + n8n.conf + assistant.conf
8. Recargar nginx: `docker exec cv-proxy nginx -s reload`
9. Crear assistant/ completo (agent/, prompts/, docker-compose.yml)
10. Levantar assistant: `docker compose -f assistant/docker-compose.yml up -d`
11. Registrar webhook Telegram (ver comando en setup.sh output)
12. Crear workflow de recordatorios en n8n (cron cada 5min → SELECT reminders WHERE sent=FALSE AND remind_at<=NOW() → sendMessage Telegram → UPDATE sent=TRUE)
13. Crear ~/Documents/README.md
14. Verificar: shared/scripts/health.sh

---

## QUALITY REQUIREMENTS

- Nunca commitear shared/.env — solo shared/.env.example
- Queries PostgreSQL siempre parametrizadas ($1, $2...) — sin interpolación de strings
- Secretos: AES-256-GCM cifrado en tool_handlers.js ANTES de pool.query() — la contraseña en claro nunca llega a la DB
- Tool use: el bucle while en server.js maneja encadenamiento de herramientas en un turno
- Historial de conversación: máximo MAX_HISTORY=20 mensajes por chat_id — evitar crecimiento indefinido
- Contenedores solo en red proxy-net — ningún puerto expuesto directamente excepto cv-proxy (80/443)
- assistant corre como USER node (no root) — ya incluido en Dockerfile
- list_items para secrets: devolver solo (id, service, username, created_at) — nunca value_encrypted
- macOS: usar `sed -i ''` en lugar de `sed -i` en todos los scripts bash
- n8n ya existe en bot_podcasts/ — no crear instancia nueva; añadir a proxy-net si no está ya
