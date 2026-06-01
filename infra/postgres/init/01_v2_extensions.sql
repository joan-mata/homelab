-- 1. New: auth schema (Auth.js required tables)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMPTZ,
  password_hash  TEXT,                        -- NULL if OAuth-only
  name           TEXT,
  image          TEXT,
  role           TEXT NOT NULL DEFAULT 'user'
                   CHECK (role IN ('user','admin')),
  locale         TEXT NOT NULL DEFAULT 'es',  -- preferred language
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth.accounts (                  -- OAuth providers (Google, Spotify)
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,          -- 'google' | 'spotify'
  provider_account_id TEXT NOT NULL,
  access_token        TEXT,
  refresh_token       TEXT,
  expires_at          BIGINT,
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS auth.verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Telegram bot ↔ web account link
CREATE TABLE IF NOT EXISTS auth.bot_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id  TEXT NOT NULL UNIQUE,
  linked_at    TIMESTAMPTZ DEFAULT NOW()
);

-- One-time codes for bot linking (6-digit, expires 15 min)
CREATE TABLE IF NOT EXISTS auth.bot_link_codes (
  code       TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  used       BOOLEAN DEFAULT FALSE
);

-- 2. Extend podcasts schema (multi-user)

-- Add user ownership to existing tables
ALTER TABLE podcasts.episodes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,        -- podcast/show artwork
  ADD COLUMN IF NOT EXISTS description TEXT,      -- episode description
  ADD COLUMN IF NOT EXISTS platform TEXT          -- 'spotify'|'youtube'|'podcast'
    CHECK (platform IN ('spotify','youtube','podcast'));

ALTER TABLE podcasts.spotify_shows
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS publisher TEXT,
  ADD COLUMN IF NOT EXISTS total_episodes INTEGER,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;          -- for regional trends

-- User actions on episodes (like/dislike/listened/list)
CREATE TABLE IF NOT EXISTS podcasts.user_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id  TEXT NOT NULL REFERENCES podcasts.episodes(id) ON DELETE CASCADE,
  action      TEXT NOT NULL
                CHECK (action IN ('like','dislike','listened','want_to_listen','saved')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id, action)
);

-- Custom user lists ("My Tech List", "Para el gym"...)
CREATE TABLE IF NOT EXISTS podcasts.user_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_public   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcasts.list_episodes (
  list_id    UUID REFERENCES podcasts.user_lists(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES podcasts.episodes(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, episode_id)
);

-- Public trending cache (rebuilt by n8n job, not by web users)
CREATE TABLE IF NOT EXISTS podcasts.trends (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id   TEXT REFERENCES podcasts.episodes(id) ON DELETE CASCADE,
  country      TEXT DEFAULT 'global',            -- 'global','ES','US', etc.
  score        NUMERIC(6,2) DEFAULT 0,           -- weighted: external + internal likes
  source       TEXT NOT NULL                     -- 'apple'|'spotify'|'podcastindex'|'web'
                 CHECK (source IN ('apple','spotify','podcastindex','web')),
  period       TEXT DEFAULT 'weekly'
                 CHECK (period IN ('daily','weekly')),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(episode_id, country, period)
);
