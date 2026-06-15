-- =======================================================================
-- VAXO Calling AI — Complete Unified Database Schema & Upgrades
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Works for both brand new databases and existing databases.
-- =======================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop potentially corrupted/old tables if they exist to ensure clean creation
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS agent_templates CASCADE;

-- 2. CREATE base users table if it does not exist
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

-- 3. UPGRADE users table with new telephony/balance fields (safe additions)
ALTER TABLE users ADD COLUMN IF NOT EXISTS telephony_provider TEXT DEFAULT 'VAPI';
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS retell_phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bland_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bland_phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telnyx_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telnyx_phone_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 4) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": false, "sms": false, "whatsapp": false, "email_address": "", "phone_number": ""}';

-- 4. UPDATE users telephony_provider check constraint to include all providers
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_telephony_provider_check;
EXCEPTION
    WHEN undefined_object THEN
        -- do nothing
END $$;

ALTER TABLE users ADD CONSTRAINT users_telephony_provider_check 
  CHECK (telephony_provider IN ('VAPI', 'RETELL', 'BLAND_AI', 'TELNYX'));

-- 5. CREATE base agents table if it does not exist
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

-- 6. UPGRADE agents table with type and catalog references
ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'VOICE' CHECK (type IN ('VOICE', 'CHAT', 'BOTH'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS call_flow JSONB DEFAULT '{"nodes":[],"edges":[]}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS chat_config JSONB DEFAULT '{"welcome_message":"Hello! How can I help you?","theme_color":"#6366f1","position":"bottom-right"}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS flow_builder JSONB DEFAULT '{"blocks": []}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'friendly' CHECK (tone IN ('formal', 'casual', 'friendly'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 7. CREATE agent_templates table (needed for type references)
CREATE TABLE IF NOT EXISTS agent_templates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  description      TEXT,
  type             TEXT NOT NULL DEFAULT 'VOICE'
                   CHECK (type IN ('VOICE', 'CHAT', 'BOTH')),
  category         TEXT DEFAULT 'GENERAL'
                   CHECK (category IN ('SALES', 'SUPPORT', 'SURVEY', 'COLLECTION', 'GENERAL')),
  default_prompt   TEXT NOT NULL,
  default_voice    TEXT DEFAULT 'sarah',
  default_language TEXT DEFAULT 'HINDI'
                   CHECK (default_language IN ('HINDI', 'ENGLISH', 'HINGLISH')),
  default_tone     TEXT DEFAULT 'friendly'
                   CHECK (default_tone IN ('formal', 'casual', 'friendly')),
  default_flow     JSONB DEFAULT '{"nodes":[],"edges":[]}',
  icon_url         TEXT,
  is_visible       BOOLEAN DEFAULT TRUE,
  is_premium       BOOLEAN DEFAULT FALSE,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 8. ADD foreign key from agents to agent_templates safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'agents_template_id_fkey'
    ) THEN
        ALTER TABLE agents ADD CONSTRAINT agents_template_id_fkey FOREIGN KEY (template_id) REFERENCES agent_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 9. CREATE campaigns table if it does not exist
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

-- 10. UPGRADE campaigns table with automated workflow support
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS automation_settings JSONB DEFAULT '{"retry_count": 2, "delay_between_calls": 30, "retry_delay": 300}';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS caller_number_type TEXT DEFAULT 'VAPI' CHECK (caller_number_type IN ('VAPI', 'ADMIN_OWN'));
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_caller_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_calls INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS retry_queue JSONB DEFAULT '[]';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS current_index INT DEFAULT 0;

-- 11. CREATE calls table if it does not exist
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

-- 12. CREATE audit_logs table if it does not exist
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

-- 13. CREATE chat_conversations table if it does not exist
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID NOT NULL REFERENCES users(id),
  agent_id        UUID NOT NULL REFERENCES agents(id),
  visitor_name    TEXT DEFAULT 'Visitor',
  visitor_email   TEXT,
  visitor_phone   TEXT,
  status          TEXT DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ENDED', 'ARCHIVED')),
  messages        JSONB DEFAULT '[]',
  metadata        JSONB DEFAULT '{}',
  intent_result   JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  ended_at        TIMESTAMPTZ
);

-- 14. CREATE leads table if it does not exist
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

-- 15. Create indexes safely
CREATE INDEX IF NOT EXISTS idx_templates_visible ON agent_templates(is_visible);
CREATE INDEX IF NOT EXISTS idx_templates_type ON agent_templates(type);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_chat_conv_admin ON chat_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_agent ON chat_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_created ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_admin_id    ON leads(admin_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_admin_id    ON calls(admin_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at  ON calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_admin_id   ON agents(admin_id);
