import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function main() {
    console.log("Testing insert into 'leads'...");
    // Try to insert a dummy lead
    const { data, error } = await supabase.from('leads').insert({
        admin_id: '98675f4f-c00b-4430-b399-36f039b26c98',
        phone: '+1234567890',
        customer_name: 'Test Lead'
    }).select();
    
    console.log("Insert result:", data, error);
}

main();
