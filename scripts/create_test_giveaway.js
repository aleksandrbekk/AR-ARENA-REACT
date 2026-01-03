
import { createClient } from '@supabase/supabase-js';

// Try to get keys from env
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


async function debugGiveaway() {
    console.log('Fetching last giveaway for debug...');
    const { data, error } = await supabase
        .from('giveaways')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching:', error);
        process.exit(1);
    }
    console.log('Sample Giveaway:', JSON.stringify(data[0], null, 2));
}

debugGiveaway();
