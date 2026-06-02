import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('users').select('*').limit(10);
  
  console.log("Users:", data);
  console.log("Error:", error);
}

main();
