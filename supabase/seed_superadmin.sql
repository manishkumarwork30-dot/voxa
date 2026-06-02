
-- Run this in your Supabase SQL Editor
INSERT INTO users (name, email, password_hash, role, plan, subscription_status, monthly_calls_limit, monthly_calls_used, is_active)
VALUES (
  'Super Admin',
  'superadmin@example.com',
  '$2b$12$E/DRk84c1jxfnPljzySn3eVGndKUOC23gW2iI3rYKh8ViZchEI8v6',
  'SUPER_ADMIN',
  'ENTERPRISE',
  'ACTIVE',
  999999,
  0,
  true
);
