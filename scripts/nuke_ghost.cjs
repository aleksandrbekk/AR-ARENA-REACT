require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
    console.error('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function nukeGhost() {
    const GHOST_ID = 579353732;

    console.log(`Searching for ghost client: ${GHOST_ID}...`);

    // 1. Check before
    const { data: before, error: err1 } = await supabase
        .from('premium_clients')
        .select('id, telegram_id, total_paid_usd, original_amount, currency')
        .eq('telegram_id', GHOST_ID)
        .single();

    if (err1) {
        console.error('Error finding ghost:', err1);
    } else {
        console.log('Ghost BEFORE:', before);
    }

    // 2. NUKE IT
    console.log('Nuking amounts...');
    const { data: updated, error: err2 } = await supabase
        .from('premium_clients')
        .update({
            total_paid_usd: 0,
            original_amount: 0,
            payments_count: 0
        })
        .eq('telegram_id', GHOST_ID)
        .select();

    if (err2) {
        console.error('Error updating:', err2);
        process.exit(1);
    }

    console.log('Ghost AFTER:', updated);
}

nukeGhost();
