// scripts/create-super-admin.ts
// Run with: npx tsx scripts/create-super-admin.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

async function main() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!name || !email || !password) {
    console.error('❌ Super admin credentials are missing in .env');
    console.error('   Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase env vars are missing');
    console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if super admin already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .single();

  if (existing) {
    console.log(`✅ Super admin already exists: ${existing.email} (id: ${existing.id})`);
    console.log('   Updating role to SUPER_ADMIN just in case...');
    const passwordHash = await bcrypt.hash(password, 12);
    await supabase
      .from('users')
      .update({ role: 'SUPER_ADMIN', password_hash: passwordHash })
      .eq('id', existing.id);
    console.log('   Done.');
    process.exit(0);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Insert into Supabase users table
  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      plan: 'ENTERPRISE',
      subscription_status: 'ACTIVE',
      monthly_calls_limit: 999999,
      monthly_calls_used: 0,
      is_active: true,
    })
    .select('id, name, email, role')
    .single();

  if (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }

  console.log('✅ Super admin created successfully!');
  console.log(`   ID:    ${data.id}`);
  console.log(`   Name:  ${data.name}`);
  console.log(`   Email: ${data.email}`);
  console.log(`   Role:  ${data.role}`);
  console.log('');
  console.log(`   Login at: http://localhost:3000/login`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
}

main();