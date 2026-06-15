-- ================================================
-- VAXO Calling AI — Telephony Providers Migration
-- Run in Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telephony_provider TEXT DEFAULT 'VAPI'
    CHECK (telephony_provider IN ('VAPI', 'RETELL', 'BLAND_AI')),
  ADD COLUMN IF NOT EXISTS retell_api_key TEXT,
  ADD COLUMN IF NOT EXISTS retell_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS bland_api_key TEXT,
  ADD COLUMN IF NOT EXISTS bland_phone_number TEXT;
