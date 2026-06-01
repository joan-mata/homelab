CREATE EXTENSION IF NOT EXISTS unaccent;

-- Schema per project (isolated)
CREATE SCHEMA IF NOT EXISTS assistant;
CREATE SCHEMA IF NOT EXISTS podcasts;
CREATE SCHEMA IF NOT EXISTS biblioteca;

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

-- ── Podcasts (bot_podcasts) ───────────────────────────────────────────────────

-- Normalisation helper: lowercase, no accents, no special chars
CREATE OR REPLACE FUNCTION podcasts.norm(t TEXT) RETURNS TEXT AS $$
  SELECT lower(unaccent(regexp_replace(coalesce(t,''), '[^a-zA-Z0-9\s]', ' ', 'g')));
$$ LANGUAGE sql IMMUTABLE;

-- Episode log: every item the user saves, listens to, or dismisses
CREATE TABLE IF NOT EXISTS podcasts.episodes (
  id              TEXT PRIMARY KEY,
  source          TEXT NOT NULL DEFAULT 'podcast'
                    CHECK (source IN ('podcast','youtube','article')),
  title           TEXT NOT NULL,
  show_name       TEXT NOT NULL DEFAULT '',
  url             TEXT NOT NULL DEFAULT '',
  duration_min    INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','listened','skipped','dismissed')),
  rating          NUMERIC(2,0),
  user_note       TEXT,
  listened_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index (Spanish stemming)
CREATE INDEX IF NOT EXISTS idx_episodes_fts ON podcasts.episodes
  USING gin(to_tsvector('spanish',
    coalesce(title,'') || ' ' || coalesce(show_name,'')));

-- Normalised index for deduplication checks
CREATE INDEX IF NOT EXISTS idx_episodes_norm ON podcasts.episodes
  (podcasts.norm(title), podcasts.norm(show_name));

-- Spotify show cache (used by /sync_spotify)
CREATE TABLE IF NOT EXISTS podcasts.spotify_shows (
  show_id     TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  rss_url     TEXT,
  description TEXT,
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Biblioteca (biblioteca) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biblioteca.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biblioteca.books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  photo_url       TEXT,
  summary         TEXT,
  rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
  personal_review TEXT,
  status          TEXT NOT NULL DEFAULT 'READ'
                    CHECK (status IN ('READ', 'TO_READ', 'ON_SHELF')),
  user_id         UUID NOT NULL REFERENCES biblioteca.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_books_user ON biblioteca.books(user_id);
