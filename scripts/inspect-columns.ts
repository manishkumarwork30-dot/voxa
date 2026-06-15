import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
    const tables = ['users', 'agents', 'campaigns', 'calls', 'leads'];
    console.log("Inspecting columns...");
    for (const table of tables) {
        // Query one row or use postgrest to get columns
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table '${table}' failed:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Table '${table}' columns:`, Object.keys(data[0]));
        } else {
            // If empty, let's try selecting a specific column to see if it exists, or check metadata
            console.log(`Table '${table}' is empty, but query succeeded.`);
            // Try to query some standard columns to check if they exist
            const testColumns = ['id', 'admin_id', 'user_id', 'created_at'];
            for (const col of testColumns) {
                const { error: colErr } = await supabase.from(table).select(col).limit(1);
                if (colErr) {
                    console.log(`  Column '${col}': NOT FOUND (${colErr.message})`);
                } else {
                    console.log(`  Column '${col}': EXISTS`);
                }
            }
        }
    }
}

main();
