import bcrypt from 'bcryptjs';
import 'dotenv/config';
import fs from 'fs';

async function main() {
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123";

  const passwordHash = await bcrypt.hash(password, 12);

  const sql = `
-- Run this in your Supabase SQL Editor
INSERT INTO users (name, email, password_hash, role, plan, subscription_status, monthly_calls_limit, monthly_calls_used, is_active)
VALUES (
  '${name}',
  '${email}',
  '${passwordHash}',
  'SUPER_ADMIN',
  'ENTERPRISE',
  'ACTIVE',
  999999,
  0,
  true
);
`;

  fs.writeFileSync('supabase/seed_superadmin.sql', sql);
  console.log("SQL seed file created at supabase/seed_superadmin.sql");
}

main();
