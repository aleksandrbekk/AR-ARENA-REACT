// User Upsert API - bypasses RLS using service role key
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
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

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        telegram_id: parseInt(telegram_id),
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        photo_url: photo_url || null,
        language_code: language_code || null,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })
      .select()

    if (error) {
      console.error('Upsert error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log('User upserted successfully:', data)
    return res.status(200).json({ ok: true, data })
  } catch (err) {
    console.error('Server error:', err)
    return res.status(500).json({ error: err.message })
  }
}
