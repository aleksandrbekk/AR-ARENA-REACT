#!/usr/bin/env node
// Mass kick expired premium users from channel and chat
// 2026-02-24

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIG (from .env)
// ============================================
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KIKER_BOT_TOKEN = process.env.KIKER_BOT_TOKEN || '8413063885:AAEa90SRTRBTJSl48JuivTEIPtPt69aMJ3k';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8265126337:AAGCjyBRX9hBtFeiHZMnAv1UYV5a8PVpUew';

const CHANNEL_ID = '-1001634734020';
const CHAT_ID = '-1001828659569';
const ADMIN_ID = '190202791';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY);

// ============================================
// HELPERS
// ============================================
function log(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function kickFromChat(telegramId, chatId) {
    try {
        // Ban
        const banRes = await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/banChatMember`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, user_id: telegramId, revoke_messages: false })
        });
        const ban = await banRes.json();

        if (ban.ok) {
            // Unban immediately so they can rejoin after payment
            await fetch(`https://api.telegram.org/bot${KIKER_BOT_TOKEN}/unbanChatMember`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, user_id: telegramId, only_if_banned: true })
            });
            return { success: true };
        } else {
            return { success: false, error: ban.description };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function sendMessage(telegramId, text, replyMarkup = null) {
    try {
        const body = { chat_id: telegramId, text, parse_mode: 'HTML' };
        if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch { return { ok: false }; }
}

// ============================================
// MAIN
// ============================================
async function main() {
    log('🚀 Starting mass kick of expired premium users...');

    // Get all expired users still in channel/chat
    const { data: expired, error } = await supabase
        .from('premium_clients')
        .select('id, telegram_id, username, plan, expires_at, in_channel, in_chat, tags')
        .lt('expires_at', new Date().toISOString())
        .or('in_channel.eq.true,in_chat.eq.true');

    if (error) {
        log(`❌ DB error: ${error.message}`);
        return;
    }

    log(`📊 Found ${expired.length} expired users to kick`);

    const results = { kicked: 0, failed: 0, details: [] };

    for (const user of expired) {
        const tid = user.telegram_id;
        const uname = user.username || 'N/A';
        const daysExpired = Math.floor((Date.now() - new Date(user.expires_at).getTime()) / 86400000);

        log(`🔨 [${results.kicked + results.failed + 1}/${expired.length}] Kicking ${tid} (@${uname}) - expired ${daysExpired}d ago`);

        let kickedChannel = false;
        let kickedChat = false;

        // Kick from channel
        if (user.in_channel) {
            const r = await kickFromChat(tid, CHANNEL_ID);
            kickedChannel = r.success;
            log(`  📢 Channel: ${r.success ? '✅' : '❌ ' + r.error}`);
            await sleep(100);
        }

        // Kick from chat
        if (user.in_chat) {
            const r = await kickFromChat(tid, CHAT_ID);
            kickedChat = r.success;
            log(`  💬 Chat: ${r.success ? '✅' : '❌ ' + r.error}`);
            await sleep(100);
        }

        // Update DB
        const newTags = user.tags || [];
        if (!newTags.includes('expired')) newTags.push('expired');
        if (!newTags.includes('kicked')) newTags.push('kicked');

        await supabase.from('premium_clients').update({
            in_channel: user.in_channel && !kickedChannel,
            in_chat: user.in_chat && !kickedChat,
            tags: newTags,
            updated_at: new Date().toISOString()
        }).eq('id', user.id);

        // Send notification to user
        const msg = `⚠️ <b>Ваша подписка AR Club истекла</b>\n\nДоступ к закрытому каналу и чату приостановлен.\n\nЧтобы восстановить доступ, продлите подписку:\n👉 <a href="https://ararena.pro/pricing">Продлить подписку</a>\n\n📞 Вопросы: @Andrey_cryptoinvestor`;

        await sendMessage(tid, msg);

        if (kickedChannel || kickedChat) {
            results.kicked++;
        } else {
            results.failed++;
        }

        results.details.push({ tid, uname, kickedChannel, kickedChat, daysExpired });

        await sleep(200); // Rate limit
    }

    // Admin report
    const report = `🧹 <b>Массовый кик истёкших подписок</b>\n\n📊 Обработано: ${expired.length}\n🚪 Кикнуто: ${results.kicked}\n❌ Ошибок: ${results.failed}\n\nДетали:\n${results.details.map(d => `• ${d.uname}: ${d.kickedChannel ? '📢✅' : '📢❌'} ${d.kickedChat ? '💬✅' : '💬❌'} (${d.daysExpired}д)`).join('\n')}`;

    await sendMessage(ADMIN_ID, report);

    log(`\n✅ Done! Kicked: ${results.kicked}, Failed: ${results.failed}`);
}

main().catch(e => {
    log(`❌ Fatal: ${e.message}`);
    process.exit(1);
});
