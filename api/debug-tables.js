
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // List all tables in public schema
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_tables_list');

        // If RPC doesn't exist, try direct query
        let tableList = tables;
        if (tablesError) {
            // Fallback: query information_schema
            const { data, error } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');

            if (error) {
                // Last resort: try known tables
                tableList = ['payment_history', 'premium_clients', 'users', 'transactions', 'payments', 'orders'];
            } else {
                tableList = data?.map(t => t.table_name) || [];
            }
        }

        // Check each known payment-related table
        const results = {};
        const possibleTables = ['payment_history', 'payments', 'transactions', 'orders', 'invoices', 'purchases'];

        for (const tableName of possibleTables) {
            try {
                const { count, error } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });

                if (!error) {
                    results[tableName] = { exists: true, count };
                } else {
                    results[tableName] = { exists: false, error: error.message };
                }
            } catch (e) {
                results[tableName] = { exists: false, error: e.message };
            }
        }

        // Also check premium_clients for comparison
        const { data: clients, error: clientsError } = await supabase
            .from('premium_clients')
            .select('id, total_paid_usd, original_amount, currency, source')
            .order('total_paid_usd', { ascending: false })
            .limit(5);

        res.status(200).json({
            table_check: results,
            top_clients: clients || [],
            clients_error: clientsError?.message || null
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
