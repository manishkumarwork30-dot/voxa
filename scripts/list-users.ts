import 'dotenv/config';
import { supabaseAdmin } from '../lib/supabase';

async function listUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role');
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.table(data);
  }
}

listUsers();
