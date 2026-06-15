-- ================================================
-- VAXO Calling AI — Schema Upgrade Migration
-- Run in Supabase SQL Editor
-- ================================================

-- ----------------------------------------
-- 1. Upgrade AGENTS table
-- ----------------------------------------
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS flow_builder JSONB DEFAULT '{"blocks": []}',
  ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'friendly'
    CHECK (tone IN ('formal', 'casual', 'friendly')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ----------------------------------------
-- 2. Upgrade CAMPAIGNS table
-- ----------------------------------------
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS automation_settings JSONB DEFAULT '{"retry_count": 2, "delay_between_calls": 30, "retry_delay": 300}',
  ADD COLUMN IF NOT EXISTS caller_number_type TEXT DEFAULT 'VAPI'
    CHECK (caller_number_type IN ('VAPI', 'ADMIN_OWN')),
  ADD COLUMN IF NOT EXISTS custom_caller_id TEXT,
  ADD COLUMN IF NOT EXISTS total_calls INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_queue JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS current_index INT DEFAULT 0;

-- ----------------------------------------
-- 3. Upgrade USERS table
-- ----------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": false, "sms": false, "whatsapp": false, "email_address": "", "phone_number": ""}',
  ADD COLUMN IF NOT EXISTS telephony_provider TEXT DEFAULT 'VAPI',
  ADD COLUMN IF NOT EXISTS retell_api_key TEXT,
  ADD COLUMN IF NOT EXISTS retell_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS bland_api_key TEXT,
  ADD COLUMN IF NOT EXISTS bland_phone_number TEXT;

-- ----------------------------------------
-- 4. NEW: LEADS table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  call_id         UUID REFERENCES calls(id) ON DELETE SET NULL,

  -- Contact info
  customer_name   TEXT NOT NULL DEFAULT 'Unknown',
  phone           TEXT NOT NULL,
  email           TEXT,

  -- Captured response
  response_text   TEXT,
  intent_score    NUMERIC(4, 3) DEFAULT 0.0, -- 0 to 1

  -- Lead status lifecycle
  status          TEXT NOT NULL DEFAULT 'NEW'
                  CHECK (status IN ('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED')),

  -- Notification tracking
  email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  sms_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_sent   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------
-- 5. Index leads for fast admin queries
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_admin_id    ON leads(admin_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_admin_id    ON calls(admin_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at  ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_admin_id   ON agents(admin_id);
