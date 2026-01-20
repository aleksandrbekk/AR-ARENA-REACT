// Верификация Telegram Login Widget данных
import crypto from 'crypto'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

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
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authData = req.body

    if (!authData || !authData.hash || !authData.id) {
      return res.status(400).json({ error: 'Invalid auth data' })
    }

    // Верифицируем данные
    const isValid = verifyTelegramAuth(authData, BOT_TOKEN)

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid authentication' })
    }

    // Проверяем что auth_date не старше 24 часов
    const authDate = authData.auth_date
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      return res.status(401).json({ error: 'Authentication expired' })
    }

    // Возвращаем данные пользователя
    return res.status(200).json({
      success: true,
      user: {
        id: authData.id,
        first_name: authData.first_name,
        last_name: authData.last_name,
        username: authData.username,
        photo_url: authData.photo_url
      }
    })

  } catch (error) {
    console.error('Telegram auth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function verifyTelegramAuth(authData, botToken) {
  const { hash, ...data } = authData

  // Создаём строку для проверки
  const checkString = Object.keys(data)
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('\n')

  // Создаём secret key из bot token с использованием HMAC (правильный алгоритм Telegram)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  // Вычисляем hash
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  return hmac === hash
}

