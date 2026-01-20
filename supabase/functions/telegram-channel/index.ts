import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// SECURITY: Token from environment variable
const BOT_TOKEN = Deno.env.get("KIKER_BOT_TOKEN")
const CHANNEL_ID = "-1001634734020"
const CHAT_ID = "-1001828659569"

if (!BOT_TOKEN) {
  console.error("CRITICAL: Missing KIKER_BOT_TOKEN environment variable")
}

const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app'
]

function getCorsHeaders(origin: string | null) {
  const corsOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, telegram_id } = await req.json()

    if (!telegram_id) {
      return new Response(JSON.stringify({ error: 'telegram_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const results = { channel: null, chat: null }

    if (action === 'kick') {
      // Кикаем из канала
      const channelRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/banChatMember`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHANNEL_ID,
            user_id: telegram_id,
            revoke_messages: false
          })
        }
      )
      results.channel = await channelRes.json()

      // Кикаем из чата
      const chatRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/banChatMember`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            user_id: telegram_id,
            revoke_messages: false
          })
        }
      )
      results.chat = await chatRes.json()

      // Сразу разбаниваем чтобы мог вернуться по ссылке
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/unbanChatMember`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHANNEL_ID, user_id: telegram_id, only_if_banned: true })
        }
      )
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/unbanChatMember`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, user_id: telegram_id, only_if_banned: true })
        }
      )
    }

    if (action === 'invite') {
      // Создаём одноразовую ссылку на канал
      const channelLinkRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHANNEL_ID,
            member_limit: 1
          })
        }
      )
      results.channel = await channelLinkRes.json()

      // Создаём одноразовую ссылку на чат
      const chatLinkRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            member_limit: 1
          })
        }
      )
      results.chat = await chatLinkRes.json()
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
