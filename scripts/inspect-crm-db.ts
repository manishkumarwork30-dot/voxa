import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const crmUrl = "https://rbgqinqymxrrtcdmwcuq.supabase.co";
const crmAnonKey = "sb_publishable_4xheuGqHYEGR5Xw6AtWA6g_kcWu1io0";

const supabase = createClient(crmUrl, crmAnonKey);

async function main() {
    const tables = ['users', 'agents', 'campaigns', 'calls', 'leads', 'agent_templates', 'chat_conversations'];
    console.log("Inspecting CRM database...");
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(0);
        if (error) {
            console.log(`Table '${table}': ERROR - ${error.message} (${error.code})`);
        } else {
            console.log(`Table '${table}': EXISTS`);
        }
    }
}

main();
