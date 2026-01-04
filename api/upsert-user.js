// User Upsert API - bypasses RLS using service role key
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl) {
    console.error('SUPABASE_URL not configured')
    return res.status(500).json({ error: 'Supabase URL not configured' })
  }

  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
    return res.status(500).json({ error: 'Service key not configured' })
  }

  const { telegram_id, username, first_name, last_name, photo_url, language_code } = req.body || {}

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id is required' })
  }

  console.log('Upserting user:', telegram_id, username)

  const supabase = createClient(supabaseUrl, serviceKey)
  const tgId = parseInt(telegram_id)

  try {
    // 1. Попробуем UPDATE существующего юзера
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        language_code: language_code || null,
        last_seen_at: new Date().toISOString()
      })
      .eq('telegram_id', tgId)
      .select()

    if (updateError) {
      console.error('Update error:', updateError)
      return res.status(500).json({ error: updateError.message })
    }

    // 2. Если юзер уже был — готово
    if (updateData && updateData.length > 0) {
      console.log('User updated:', updateData)
      return res.status(200).json({ ok: true, data: updateData, action: 'updated' })
    }

    // 3. Юзера нет — создаём напрямую с дефолтными значениями
    console.log('User not found, creating directly...')
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: tgId,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        language_code: language_code || null,
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
      return res.status(500).json({ error: insertError.message })
    }

    // 4. Получим созданного юзера
    const { data: newUser } = await supabase
      .from('users')
      .select()
      .eq('telegram_id', tgId)
      .single()

    console.log('User created:', newUser)
    return res.status(200).json({ ok: true, data: newUser, action: 'created' })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
}
