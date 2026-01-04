// Debug API to find triggers - TEMPORARY
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Config missing' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // Попробуем вызвать get_bull_game_state для нового юзера
    // и поймать ошибку с полным стеком
    const testId = '999888777'

    const { data, error } = await supabase.rpc('get_bull_game_state', {
      p_telegram_id: testId
    })

    if (error) {
      return res.status(200).json({
        test: 'get_bull_game_state for new user',
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
    }

    // Если успешно - удалим тестового юзера
    await supabase.from('users').delete().eq('telegram_id', parseInt(testId))

    return res.status(200).json({
      test: 'get_bull_game_state for new user',
      success: true,
      data
    })
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
}
