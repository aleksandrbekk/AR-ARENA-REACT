
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NDQxMSwiZXhwIjoyMDczMzQwNDExfQ.7ueEYBhFrxKU3_RJi_iJEDj6EQqWBy3gAXiM4YIALqs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixDates() {
    const corrections = [
        { id: 850362354, daysToSubtract: 30 },
        { id: 513896695, daysToSubtract: 90 }
    ];

    for (const { id, daysToSubtract } of corrections) {
        const { data: client, error } = await supabase
            .from('premium_clients')
            .select('*')
            .eq('telegram_id', id)
            .single();

        if (error || !client) {
            console.error(`Client ${id} not found or error`, error);
            continue;
        }

        const currentExpires = new Date(client.expires_at);
        const newExpires = new Date(currentExpires.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

        console.log(`Fixing client ${id}:`);
        console.log(`  Current: ${currentExpires.toISOString()}`);
        console.log(`  New:     ${newExpires.toISOString()} (-${daysToSubtract} days)`);

        const { error: updateError } = await supabase
            .from('premium_clients')
            .update({ expires_at: newExpires.toISOString() })
            .eq('telegram_id', id);

        if (updateError) {
            console.error(`Failed to update ${id}:`, updateError);
        } else {
            console.log(`✅ Updated ${id} successfully`);
        }
    }
}

fixDates();
