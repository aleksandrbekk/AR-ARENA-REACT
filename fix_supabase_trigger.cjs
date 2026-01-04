// Автоматический фикс триггера в Supabase через Playwright
const { chromium } = require('playwright')

const SUPABASE_PROJECT = 'syxjkircmiwpnpagznay'
const GITHUB_EMAIL = 'aleksandrbekk@bk.ru'
const GITHUB_PASSWORD = 'xYrsyp-6jyhgy-gubjyc'

async function main() {
  console.log('🚀 Запуск браузера...')
  const browser = await chromium.launch({ headless: false }) // headless: false для отладки
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. Заходим в Supabase
    console.log('📍 Открываем Supabase Dashboard...')
    await page.goto(`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`)

    // 2. Если нужна авторизация - логинимся через GitHub
    await page.waitForTimeout(3000)

    if (page.url().includes('login') || page.url().includes('sign-in')) {
      console.log('🔐 Нужна авторизация, входим через GitHub...')

      // Клик на "Sign in with GitHub"
      await page.click('text=GitHub')
      await page.waitForTimeout(2000)

      // Вводим GitHub креденшелы
      if (page.url().includes('github.com')) {
        await page.fill('input[name="login"]', GITHUB_EMAIL)
        await page.fill('input[name="password"]', GITHUB_PASSWORD)
        await page.click('input[type="submit"]')
        await page.waitForTimeout(5000)
      }
    }

    // 3. Переходим в SQL Editor
    console.log('📝 Открываем SQL Editor...')
    await page.goto(`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`)
    await page.waitForTimeout(3000)

    // 4. Выполняем SQL для поиска триггеров
    const findTriggersSQL = `
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'users';
    `

    console.log('🔍 Ищем триггеры на таблице users...')

    // Находим редактор и вставляем SQL
    const editor = await page.locator('.monaco-editor textarea')
    await editor.fill(findTriggersSQL)

    // Нажимаем Run
    await page.click('button:has-text("Run")')
    await page.waitForTimeout(3000)

    // Получаем результат
    const result = await page.locator('.result-table, .grid').textContent().catch(() => 'No result')
    console.log('📊 Результат:', result)

    // 5. Если нашли триггер - удаляем его
    // ... (дополнительная логика)

    console.log('✅ Готово! Проверь результат в браузере.')
    console.log('Браузер остается открытым для ручной проверки.')
    console.log('Закрой его когда закончишь.')

    // Ждем закрытия браузера пользователем
    await page.waitForTimeout(600000) // 10 минут

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
