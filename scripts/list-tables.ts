import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
    
    console.log("Users query result:", data, error);
    
    // Let's try to query information_schema or pg_tables
    const { data: infoData, error: infoError } = await supabase
        .from('information_schema.tables')
        .select('table_schema, table_name')
        .eq('table_name', 'users');
    
    console.log("Information schema query result:", infoData, infoError);
}

main();
