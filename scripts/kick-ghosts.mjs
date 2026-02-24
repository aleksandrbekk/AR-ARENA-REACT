#!/usr/bin/env node
// Mass kick "ghosts" (users in channel without active subscription)
// Checking all known Telegram IDs in the DB
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG
// ============================================
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN || '8413063885:AAEa90SRTRBTJSl48JuivTEIPtPt69aMJ3k';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8265126337:AAGCjyBRX9hBtFeiHZMnAv1UYV5a8PVpUew';

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';
const ADMIN_ID = '190202791';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkMember(telegramId, chatId) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`);
        const data = await res.json();
        if (!data.ok) return { inChat: false };
        const status = data.result.status;
        return { inChat: ['member', 'creator', 'administrator', 'restricted'].includes(status), status };
    } catch (e) {
        return { inChat: false };
    }
}

async function kickFromChat(telegramId, chatId) {
    try {
        const banRes = await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/banChatMember`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, user_id: telegramId, revoke_messages: false })
        });
        const ban = await banRes.json();
        if (ban.ok) {
            await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/unbanChatMember`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, user_id: telegramId, only_if_banned: true })
            });
            return { success: true };
        }
        return { success: false, error: ban.description };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function main() {
    log('🚀 Starting ghost kick process...');

    // 1. Get ALL known Telegram IDs
    const allIds = new Set();

    // From users
    const { data: users } = await supabase.from('users').select('telegram_id');
    users?.forEach(u => u.telegram_id && allIds.add(u.telegram_id.toString()));

    // From bot_users
    const { data: botUsers } = await supabase.from('bot_users').select('id');
    botUsers?.forEach(u => u.id && allIds.add(u.id.toString()));

    // From premium_clients
    const { data: premiumClients } = await supabase.from('premium_clients').select('telegram_id');
    premiumClients?.forEach(u => u.telegram_id && allIds.add(u.telegram_id.toString()));

    log(`📊 Total unique Telegram IDs in DB: ${allIds.size}`);

    // 2. Remove ACTIVE subscriptions from this list
    const { data: activeClients } = await supabase
        .from('premium_clients')
        .select('telegram_id')
        .gte('expires_at', new Date().toISOString());

    let activeCount = 0;
    activeClients?.forEach(c => {
        if (c.telegram_id && allIds.has(c.telegram_id.toString())) {
            allIds.delete(c.telegram_id.toString());
            activeCount++;
        }
    });

    log(`📊 Removed ${activeCount} active subscriptions. Remaining to check: ${allIds.size}`);

    // 3. Check remaining IDs - are they in the channel?
    const idsToCheck = Array.from(allIds);
    let ghostsFound = 0;
    let ghostsKicked = 0;

    // Exclude known admins
    const adminsRes = await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/getChatAdministrators?chat_id=${CHANNEL_ID}`);
    const adminsData = await adminsRes.json();
    const adminIds = new Set((adminsData.result || []).map(a => a.user.id.toString()));

    for (let i = 0; i < idsToCheck.length; i++) {
        const tid = idsToCheck[i];

        // Skip admins
        if (adminIds.has(tid)) continue;

        if (i % 100 === 0) log(`⏳ Checking ${i}/${idsToCheck.length}...`);

        // Check channel
        const member = await checkMember(tid, CHANNEL_ID);
        if (member.inChat) {
            ghostsFound++;
            log(`👻 Found ghost in channel! ID: ${tid}`);

            // Kick from channel
            const resChannel = await kickFromChat(tid, CHANNEL_ID);
            // Kick from chat as well just in case
            await kickFromChat(tid, CHAT_ID);

            if (resChannel.success) {
                ghostsKicked++;
                log(`  ✅ Kicked ${tid}`);
            } else {
                log(`  ❌ Failed to kick ${tid}: ${resChannel.error}`);
            }

            // Update DB if they exist in premium_clients
            await supabase.from('premium_clients')
                .update({ in_channel: false, in_chat: false })
                .eq('telegram_id', tid);
        }

        await sleep(40); // rate limit for API
    }

    log(`\n==== DONE ====`);
    log(`Found ghosts in DB IDs: ${ghostsFound}`);
    log(`Successfully kicked: ${ghostsKicked}`);
}

main().catch(console.error);
