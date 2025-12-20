// Скрипт для поиска проекта LEHA в Supabase и выполнения SQL запроса
import { chromium } from 'playwright';

const SUPABASE_EMAIL = 'aleksandrbekk@bk.ru';
const SUPABASE_PASSWORD = 'xYrsyp-6jyhgy-gubjyc';

async function findLehaProject() {
  console.log('🚀 Поиск проекта LEHA в Supabase...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Переходим на страницу входа
    console.log('📱 Открываю Supabase Dashboard...');
    await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Ищем кнопку GitHub
    console.log('🔍 Ищу кнопку входа через GitHub...');
    const githubButton = page.locator('button:has-text("GitHub"), a:has-text("GitHub")').first();
    
    if (await githubButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Найдена кнопка GitHub, кликаю...');
      await githubButton.click();
      await page.waitForTimeout(5000);
      
      // Если перенаправило на GitHub
      if (page.url().includes('github.com')) {
        console.log('🔐 Страница GitHub обнаружена');
        
        // Вводим email
        const emailInput = page.locator('input[name="login"], input[id="login_field"]');
        if (await emailInput.isVisible({ timeout: 5000 })) {
          await emailInput.fill(SUPABASE_EMAIL);
          await page.waitForTimeout(500);
          
          // Вводим password
          const passwordInput = page.locator('input[name="password"], input[id="password"]');
          if (await passwordInput.isVisible({ timeout: 3000 })) {
            await passwordInput.fill(SUPABASE_PASSWORD);
            await page.waitForTimeout(500);
            
            // Sign in - используем более точный селектор
            const signInButton = page.locator('input[name="commit"][value="Sign in"]').first();
            if (await signInButton.isVisible({ timeout: 3000 })) {
              console.log('✅ Нажимаю Sign in на GitHub...');
              await signInButton.click();
              await page.waitForTimeout(5000);
              
              // Авторизация приложения
              const authorizeButton = page.locator('button:has-text("Authorize"), button[name="authorize"]');
              if (await authorizeButton.isVisible({ timeout: 5000 })) {
                await authorizeButton.click();
                await page.waitForTimeout(5000);
              }
            }
          }
        }
      }
    }

    // Ждем возврата в Supabase
    await page.waitForTimeout(5000);
    console.log(`📍 Текущий URL: ${page.url()}`);
    
    // Переходим на страницу проектов
    if (!page.url().includes('/dashboard/projects')) {
      await page.goto('https://supabase.com/dashboard/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
    }

    // Ищем проект LEHA
    console.log('\n🔍 Ищу проект "LEHA"...');
    await page.waitForTimeout(3000);
    
    // Пробуем найти по тексту
    const pageContent = await page.textContent('body');
    if (pageContent?.includes('LEHA')) {
      console.log('✅ Найдено упоминание "LEHA" на странице');
      
      // Ищем ссылку на проект
      const lehaLink = page.locator('a:has-text("LEHA"), [href*="project"]:has-text("LEHA")').first();
      if (await lehaLink.isVisible({ timeout: 5000 })) {
        const href = await lehaLink.getAttribute('href');
        console.log(`✅ Найдена ссылка на проект: ${href}`);
        await lehaLink.click();
        await page.waitForTimeout(5000);
      }
    }
    
    // Получаем текущий URL проекта
    const projectUrl = page.url();
    console.log(`\n📍 URL проекта: ${projectUrl}`);
    
    // Извлекаем REF из URL
    const refMatch = projectUrl.match(/\/project\/([^\/]+)/);
    if (refMatch) {
      const projectRef = refMatch[1];
      const supabaseUrl = `https://${projectRef}.supabase.co`;
      console.log(`\n✅ НАЙДЕН ПРОЕКТ LEHA!`);
      console.log(`   REF: ${projectRef}`);
      console.log(`   URL: ${supabaseUrl}`);
      
      // Выполняем SQL запрос через REST API
      console.log('\n📊 Выполняю SQL запрос: SELECT COUNT(*) FROM users');
      
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
      
      try {
        const response = await page.evaluate(async (url, key) => {
          const res = await fetch(`${url}/rest/v1/users?select=id&limit=0`, {
            method: 'HEAD',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Prefer': 'count=exact'
            }
          });
          return {
            status: res.status,
            count: res.headers.get('content-range')?.split('/')[1] || null
          };
        }, supabaseUrl, supabaseKey);
        
        if (response.status === 200 || response.status === 206) {
          console.log(`✅ Запрос выполнен успешно!`);
          console.log(`📈 Количество пользователей: ${response.count || 'неизвестно'}`);
        } else {
          console.log(`⚠️ Статус ответа: ${response.status}`);
        }
      } catch (err) {
        console.log(`⚠️ Не удалось выполнить запрос через REST API: ${err.message}`);
      }
      
      // Пробуем через SQL Editor в интерфейсе
      console.log('\n🔍 Пробую открыть SQL Editor...');
      const sqlEditorLink = page.locator('a:has-text("SQL Editor"), a[href*="sql"]').first();
      if (await sqlEditorLink.isVisible({ timeout: 5000 })) {
        await sqlEditorLink.click();
        await page.waitForTimeout(3000);
        
        // Вводим SQL запрос
        const sqlInput = page.locator('textarea, .view-lines, [contenteditable="true"]').first();
        if (await sqlInput.isVisible({ timeout: 5000 })) {
          console.log('📝 Ввожу SQL запрос...');
          await sqlInput.click();
          await page.keyboard.press('Meta+A');
          await page.keyboard.type('SELECT COUNT(*) FROM users;', { delay: 50 });
          await page.waitForTimeout(1000);
          
          // Запускаем запрос
          const runButton = page.locator('button:has-text("Run"), button:has-text("Execute")').first();
          if (await runButton.isVisible({ timeout: 3000 })) {
            await runButton.click();
            await page.waitForTimeout(3000);
            
            // Делаем скриншот результата
            await page.screenshot({ path: 'sql-query-result.png', fullPage: true });
            console.log('📸 Скриншот результата сохранен: sql-query-result.png');
          }
        }
      }
      
      console.log(`\n📋 Обновите src/lib/supabase.ts:`);
      console.log(`   const supabaseUrl = '${supabaseUrl}'`);
      
    } else {
      console.log('❌ Не удалось извлечь REF из URL');
      console.log('📸 Делаю скриншот для анализа...');
      await page.screenshot({ path: 'supabase-project-page.png', fullPage: true });
    }
    
    // Ждем для ручной проверки
    console.log('\n⏸️ Ожидание 60 секунд для ручной проверки...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await page.screenshot({ path: 'supabase-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

findLehaProject().catch(console.error);

