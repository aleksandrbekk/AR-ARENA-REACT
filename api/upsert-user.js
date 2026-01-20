// User Upsert API - Secure version with Telegram initData validation
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
// Use standard TELEGRAM_BOT_TOKEN as per .env.local
const botToken = process.env.TELEGRAM_BOT_TOKEN

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ar-arena.games',
  'https://www.ar-arena.games',
  'https://ar-arena-react.vercel.app',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean)

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin
  const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', corsOrigin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!supabaseUrl || !serviceKey) {
    console.error('SUPABASE config missing')
    res.status(500).json({ error: 'Server configuration error' })
    return
  }

  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN missing')
    res.status(500).json({ error: 'Server auth configuration missing' })
    return
  }

  const { initData } = req.body || {}

  if (!initData) {
    res.status(401).json({ error: 'No authorization data provided' })
    return
  }

  try {
    // --- 1. Validate Telegram Signature ---
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      throw new Error('No hash provided')
    }

    urlParams.delete('hash')

    // Sort keys logically
    const params = []
    for (const [key, value] of urlParams.entries()) {
      params.push(`${key}=${value}`)
    }
    params.sort()

    const dataCheckString = params.join('\n')

    // Compute Secret Key: HMAC-SHA256 of "WebAppData" using Bot Token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    // Compute Hash: HMAC-SHA256 of dataCheckString using Secret Key
    const generatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    if (generatedHash !== hash) {
      console.warn('Signature mismatch. Generated:', generatedHash, 'Provided:', hash)
      throw new Error('Invalid signature')
    }

    // Check auth_date for expiration (e.g. 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0')
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      throw new Error('Session expired')
    }

    // --- 2. Extract User Data ---
    const userStr = urlParams.get('user')
    if (!userStr) {
      throw new Error('No user data found')
    }

    const telUser = JSON.parse(userStr)
    const telegram_id = telUser.id

    console.log('Authorized User:', telegram_id, telUser.username)

    // --- 3. Perform Upsert with Service Role ---
    const supabase = createClient(supabaseUrl, serviceKey)

    // A) Try UPDATE
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        username: telUser.username || null,
        first_name: telUser.first_name || null,
        last_name: telUser.last_name || null,
        photo_url: telUser.photo_url || null,
        language_code: telUser.language_code || null,
        last_seen_at: new Date().toISOString()
      })
      .eq('telegram_id', telegram_id)
      .select()

    if (updateError) {
      console.error('Update error:', updateError)
      throw new Error(updateError.message)
    }

    if (updateData && updateData.length > 0) {
      res.status(200).json({ ok: true, data: updateData[0], action: 'updated' })
      return
    }

    // B) Insert if not exists
    console.log('User not found, creating...')
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegram_id,
        username: telUser.username || null,
        first_name: telUser.first_name || null,
        last_name: telUser.last_name || null,
        photo_url: telUser.photo_url || null,
        language_code: telUser.language_code || null,
        balance_bul: 0,
        balance_ar: 0,
        energy: 100,
        energy_max: 100,
        level: 1,
        xp: 0,
        xp_to_next: 100,
        active_skin: 'Bull1.png',
        last_energy_update: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(insertError.message)
    }

    // Return created user
    const { data: newUser } = await supabase
      .from('users')
      .select()
      .eq('telegram_id', telegram_id)
      .single()

    res.status(200).json({ ok: true, data: newUser, action: 'created' })

  } catch (err) {
    console.error('Auth Error:', err.message)
    res.status(401).json({ error: 'Unauthorized: ' + err.message })
  }
}
