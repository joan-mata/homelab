CREATE EXTENSION IF NOT EXISTS unaccent;

-- Schema per project (isolated)
CREATE SCHEMA IF NOT EXISTS assistant;
CREATE SCHEMA IF NOT EXISTS podcasts;

-- ── Assistant ─────────────────────────────────────────────────────────────────

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

-- value_encrypted: AES-256-GCM encrypted BEFORE insert — plaintext never reaches DB
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
