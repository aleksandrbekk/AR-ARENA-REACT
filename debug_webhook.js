
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[match[1].trim()] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Could not read .env.local', e.message);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Try Service Role Key first, then Anon Key
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', SUPABASE_URL);
console.log('Key available:', !!SUPABASE_KEY);
console.log('Key type:', env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon/Unknown');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log('Querying webhook_logs...');

    const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        // .eq('source', 'lava.top')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
        // If error is 404/PGRST permission denied, we might need service role
    } else {
        console.log(`Found ${data.length} logs`);
        data.forEach(log => {
            console.log('\n================================');
            console.log(`ID: ${log.id}`);
            console.log(`Time: ${log.created_at}`);
            console.log('Payload Snippet:', JSON.stringify(log.payload, null, 2));
        });
    }
}

run();
