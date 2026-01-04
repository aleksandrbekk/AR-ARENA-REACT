const { chromium } = require('playwright')

const SUPABASE_PROJECT = 'syxjkircmiwpnpagznay'
const GITHUB_EMAIL = 'aleksandrbekk@bk.ru'
const GITHUB_PASSWORD = 'xYrsyp-6jyhgy-gubjyc'

const SQL_TO_EXECUTE = `-- Получить исходный код функции purchase_location
SELECT prosrc as source_code
FROM pg_proc
WHERE proname = 'purchase_location'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');`

async function main() {
  console.log('🚀 Запуск браузера...')
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  })
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(60000)

  try {
    // 1. Открываем SQL Editor
    console.log('📍 Открываем Supabase SQL Editor...')
    await page.goto(`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // 2. Проверяем нужна ли авторизация
    console.log('📍 URL:', page.url())

    // Ищем кнопку GitHub
    const githubBtn = page.locator('button:has-text("Continue with GitHub")')
    if (await githubBtn.isVisible().catch(() => false)) {
      console.log('🔐 Кликаем Continue with GitHub...')
      await githubBtn.click()
      await page.waitForTimeout(5000)

      // Если на GitHub - вводим креды
      if (page.url().includes('github.com')) {
        console.log('📝 Вводим GitHub credentials...')

        await page.waitForSelector('input[name="login"]', { timeout: 10000 })
        await page.fill('input[name="login"]', GITHUB_EMAIL)
        await page.fill('input[name="password"]', GITHUB_PASSWORD)
        await page.click('input[type="submit"]')
        await page.waitForTimeout(8000)

        // Authorize если нужно
        if (page.url().includes('authorize')) {
          console.log('🔓 Кликаем Authorize...')
          await page.click('button:has-text("Authorize")')
          await page.waitForTimeout(5000)
        }
      }

      // Ждём редирект обратно в Supabase
      console.log('⏳ Ждём редирект в dashboard...')
      await page.waitForTimeout(5000)

      // Переходим в SQL Editor
      console.log('📍 Переходим в SQL Editor...')
      await page.goto(`https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql/new`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(5000)
    }

    // 3. Скриншот текущего состояния
    await page.screenshot({ path: '/tmp/supabase_before.png', fullPage: true })
    console.log('📸 Скриншот: /tmp/supabase_before.png')

    // 4. Вставляем SQL через evaluate (Monaco editor)
    console.log('📝 Вставляем SQL в редактор...')

    await page.waitForSelector('.monaco-editor', { timeout: 15000 })
    await page.waitForTimeout(1000)

    // Используем Monaco API напрямую
    await page.evaluate((sql) => {
      const editors = window.monaco?.editor?.getEditors?.()
      if (editors && editors.length > 0) {
        editors[0].setValue(sql)
      }
    }, SQL_TO_EXECUTE)

    await page.waitForTimeout(1000)
    await page.screenshot({ path: '/tmp/supabase_sql.png', fullPage: true })
    console.log('📸 Скриншот с SQL: /tmp/supabase_sql.png')

    // 5. Нажимаем Run (используем точный testid)
    console.log('▶️ Выполняем SQL...')
    const runButton = page.getByTestId('sql-run-button')
    await runButton.click()
    await page.waitForTimeout(3000)

    // 6. Скриншот результата
    await page.screenshot({ path: '/tmp/supabase_result.png', fullPage: true })
    console.log('📸 Результат: /tmp/supabase_result.png')

    // Пробуем получить текст результата
    const pageText = await page.locator('body').textContent()
    if (pageText.includes('Success')) {
      console.log('✅ SQL выполнен успешно!')
    } else if (pageText.includes('error') || pageText.includes('Error')) {
      console.log('❌ Возможна ошибка, проверь скриншот')
    }

    // Пробуем найти ячейку с результатом и кликнуть для копирования
    const resultCell = page.locator('[role="gridcell"]').first()
    if (await resultCell.isVisible().catch(() => false)) {
      const cellText = await resultCell.textContent()
      console.log('\\n📋 Результат (первые 2000 символов):')
      console.log(cellText?.substring(0, 2000))
    }

    console.log('\n🎯 Готово! Браузер закроется через 5 секунд.')
    console.log('Скриншоты сохранены в /tmp/')
    await page.waitForTimeout(5000)

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    await page.screenshot({ path: '/tmp/supabase_error.png', fullPage: true })
    console.log('📸 Скриншот ошибки: /tmp/supabase_error.png')
    await page.waitForTimeout(60000) // Оставляем открытым для отладки
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
