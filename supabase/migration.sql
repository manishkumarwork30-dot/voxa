-- Supabase Migration: Create tables for AI Calling Agent platform
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'USER'
                CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Admin's VAPI config
  vapi_api_key      TEXT,
  vapi_phone_number TEXT,

  -- SaaS / billing
  plan                TEXT DEFAULT 'STARTER'
                      CHECK (plan IN ('STARTER', 'PRO', 'ENTERPRISE')),
  subscription_status TEXT DEFAULT 'TRIAL'
                      CHECK (subscription_status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIAL')),
  monthly_calls_limit INT  DEFAULT 100,
  monthly_calls_used  INT  DEFAULT 0,
  stripe_customer_id  TEXT,
  billing_cycle_end   TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

-- ========================================
-- AGENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  vapi_agent_id TEXT NOT NULL UNIQUE,
  language      TEXT NOT NULL DEFAULT 'HINDI'
                CHECK (language IN ('HINDI', 'ENGLISH', 'HINGLISH')),
  voice_model   TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'PAUSED', 'DELETED')),
  admin_id      UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- CAMPAIGNS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  admin_id     UUID NOT NULL REFERENCES users(id),
  agent_id     UUID NOT NULL REFERENCES agents(id),
  type         TEXT NOT NULL CHECK (type IN ('INBOUND', 'OUTBOUND')),
  contacts     JSONB NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'DRAFT'
               CHECK (status IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED')),
  scheduled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- CALLS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS calls (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vapi_call_id   TEXT NOT NULL UNIQUE,
  admin_id       UUID NOT NULL REFERENCES users(id),
  agent_id       UUID NOT NULL REFERENCES agents(id),
  campaign_id    UUID REFERENCES campaigns(id),
  direction      TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  caller_number  TEXT NOT NULL,
  duration_sec   INT NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'INITIATED'
                 CHECK (status IN ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER')),
  transcript     TEXT,
  recording_url  TEXT,
  cost_usd       NUMERIC(10,4),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);

-- ========================================
-- AUDIT LOGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  action       TEXT NOT NULL,
  target_table TEXT,
  target_id    TEXT,
  ip_address   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- ROW LEVEL SECURITY (optional, can be enabled later)
-- ========================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
