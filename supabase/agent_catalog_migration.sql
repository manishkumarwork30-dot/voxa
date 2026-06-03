-- ================================================
-- VAXO Calling AI — Agent Catalog & Chat Migration
-- Run in Supabase SQL Editor
-- ================================================

-- ----------------------------------------
-- 1. AGENT_TEMPLATES table (Super Admin catalog)
-- ----------------------------------------
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

-- ----------------------------------------
-- 2. Extend AGENTS table with type + chat config
-- ----------------------------------------
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'VOICE'
    CHECK (type IN ('VOICE', 'CHAT', 'BOTH')),
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES agent_templates(id),
  ADD COLUMN IF NOT EXISTS call_flow JSONB DEFAULT '{"nodes":[],"edges":[]}',
  ADD COLUMN IF NOT EXISTS chat_config JSONB DEFAULT '{"welcome_message":"Hello! How can I help you?","theme_color":"#6366f1","position":"bottom-right"}';

-- ----------------------------------------
-- 3. CHAT_CONVERSATIONS table
-- ----------------------------------------
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

-- ----------------------------------------
-- 4. Indexes
-- ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_templates_visible ON agent_templates(is_visible);
CREATE INDEX IF NOT EXISTS idx_templates_type ON agent_templates(type);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_chat_conv_admin ON chat_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_agent ON chat_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_created ON chat_conversations(created_at DESC);
