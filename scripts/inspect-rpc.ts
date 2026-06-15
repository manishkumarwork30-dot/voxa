import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

async function main() {
  const url = `${supabaseUrl}/rest/v1/`;
  console.log("Fetching API schema from:", url);
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const schema = await res.json();
    console.log("Paths in schema:", Object.keys(schema.paths || {}));
  } catch (err: any) {
    console.error("Error fetching schema:", err.message);
  }
}

main();
