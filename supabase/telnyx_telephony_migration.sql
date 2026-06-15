-- ================================================
-- VAXO Calling AI — Telnyx Telephony Provider Migration
-- Run in Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telnyx_api_key TEXT,
  ADD COLUMN IF NOT EXISTS telnyx_phone_number TEXT;

-- Safely update the check constraint for telephony_provider
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_telephony_provider_check;
EXCEPTION
    WHEN undefined_object THEN
        -- do nothing
END $$;

ALTER TABLE users ADD CONSTRAINT users_telephony_provider_check 
  CHECK (telephony_provider IN ('VAPI', 'RETELL', 'BLAND_AI', 'TELNYX'));
