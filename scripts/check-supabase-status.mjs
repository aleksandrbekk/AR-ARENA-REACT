// Скрипт для проверки статуса проекта Supabase через Playwright
import { chromium } from 'playwright';

const SUPABASE_EMAIL = 'aleksandrbekk@bk.ru';
const SUPABASE_PASSWORD = 'xYrsyp-6jyhgy-gubjyc';
const PROJECT_REF = 'syxjkircmiwpnpagznay'; // Старый проект
const PROJECT_NAME = 'LEHA'; // Ищем проект с таким именем

async function checkSupabaseStatus() {
  console.log('🚀 Запуск проверки статуса Supabase проекта...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Переходим на страницу входа в Supabase
    console.log('📱 Открываю Supabase Dashboard...');
    await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Проверяем, авторизованы ли мы уже
    const currentUrl = page.url();
    console.log(`📍 Текущий URL: ${currentUrl}`);
    
    if (currentUrl.includes('/dashboard/projects') || currentUrl.includes('/dashboard/project/')) {
      console.log('✅ Уже авторизован, переходим к списку проектов');
    } else {
      // Ищем кнопку входа через GitHub
      console.log('🔍 Ищу кнопку входа через GitHub...');
      const githubSelectors = [
        'button:has-text("GitHub")',
        'a:has-text("GitHub")',
        '[href*="github"]',
        'button[data-provider="github"]',
        '.auth-provider-github'
      ];
      
      let githubButton = null;
      for (const selector of githubSelectors) {
        try {
          githubButton = page.locator(selector).first();
          if (await githubButton.isVisible({ timeout: 2000 })) {
            console.log(`✅ Найдена кнопка GitHub (${selector}), кликаю...`);
            await githubButton.click();
            await page.waitForTimeout(5000);
            break;
          }
        } catch (e) {
          // Пробуем следующий селектор
        }
      }
      
      if (!githubButton || !(await githubButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        console.log('⚠️ Кнопка GitHub не найдена, пробую прямой переход...');
        await page.goto('https://supabase.com/dashboard/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
      }
    }

    // Ждем редиректа на GitHub или появления формы входа
    await page.waitForTimeout(3000);
    
    // Если нас перенаправило на GitHub
    if (page.url().includes('github.com/login')) {
      console.log('🔐 Обнаружена страница входа GitHub');
      
      // Вводим email
      const githubEmail = page.locator('input[name="login"], input[id="login_field"]');
      if (await githubEmail.isVisible({ timeout: 5000 })) {
        console.log('📧 Ввожу GitHub email...');
        await githubEmail.fill(SUPABASE_EMAIL);
        await page.waitForTimeout(500);
        
        // Вводим password
        const githubPassword = page.locator('input[name="password"], input[id="password"]');
        if (await githubPassword.isVisible({ timeout: 3000 })) {
          console.log('🔑 Ввожу GitHub password...');
          await githubPassword.fill(SUPABASE_PASSWORD);
          await page.waitForTimeout(500);
          
          // Нажимаем Sign in
          const githubSignIn = page.locator('input[name="commit"], button:has-text("Sign in")');
          if (await githubSignIn.isVisible({ timeout: 3000 })) {
            console.log('✅ Нажимаю Sign in на GitHub...');
            await githubSignIn.click();
            await page.waitForTimeout(5000);
            
            // Если есть двухфакторная аутентификация или подтверждение
            const authorizeButton = page.locator('button:has-text("Authorize"), button[name="authorize"]');
            if (await authorizeButton.isVisible({ timeout: 5000 })) {
              console.log('🔐 Подтверждаю авторизацию GitHub...');
              await authorizeButton.click();
              await page.waitForTimeout(5000);
            }
          }
        }
      }
    }
    
    // Если нужно ввести email/password напрямую в Supabase (fallback)
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible({ timeout: 3000 })) {
      console.log('📧 Ввожу email...');
      await emailInput.fill(SUPABASE_EMAIL);
      await page.waitForTimeout(500);
      
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      if (await passwordInput.isVisible({ timeout: 3000 })) {
        console.log('🔑 Ввожу password...');
        await passwordInput.fill(SUPABASE_PASSWORD);
        await page.waitForTimeout(500);
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
        if (await submitButton.isVisible({ timeout: 3000 })) {
          await submitButton.click();
          await page.waitForTimeout(5000);
        }
      }
    }

    // Ждем загрузки дашборда или редиректа обратно в Supabase
    console.log('⏳ Жду загрузки дашборда...');
    await page.waitForTimeout(8000);
    
    // Проверяем текущий URL
    const finalUrl = page.url();
    console.log(`📍 URL после авторизации: ${finalUrl}`);
    
    // Если мы все еще не в дашборде, пробуем перейти напрямую
    if (!finalUrl.includes('/dashboard/projects') && !finalUrl.includes('/dashboard/project/')) {
      console.log('🔄 Переход на страницу проектов...');
      await page.goto('https://supabase.com/dashboard/projects', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
    }

    // Выводим список всех проектов
    console.log(`🔍 Ищу все проекты...`);
    await page.waitForTimeout(8000);
    
    // Пробуем разные селекторы для проектов
    const projectSelectors = [
      'a[href*="/project/"]',
      '[href*="supabase.com/dashboard/project"]',
      '[data-project-ref]',
      '.project-card',
      '[class*="project"]',
      'a[href*="dashboard/project"]',
      'div[class*="ProjectCard"]',
      'div[class*="project-card"]',
      'a[class*="project"]'
    ];
    
    let projectLinks = [];
    for (const selector of projectSelectors) {
      try {
        const links = await page.locator(selector).all();
        if (links.length > 0) {
          console.log(`✅ Найдено проектов через ${selector}: ${links.length}`);
          projectLinks = links;
          break;
        }
      } catch (e) {
        // Пробуем следующий селектор
      }
    }
    
    // Если не нашли через селекторы, пробуем найти по тексту на странице
    if (projectLinks.length === 0) {
      console.log('🔍 Пробую найти проекты по тексту на странице...');
      const pageText = await page.textContent('body');
      if (pageText?.includes('LEHA') || pageText?.includes('project')) {
        console.log('✅ На странице есть упоминания проектов');
        // Делаем скриншот для анализа
        await page.screenshot({ path: 'supabase-projects-page.png', fullPage: true });
        console.log('📸 Скриншот сохранен: supabase-projects-page.png');
      }
    }
    
    console.log(`📋 Всего найдено проектов: ${projectLinks.length}`);
    
    if (projectLinks.length > 0) {
      console.log('\n📋 СПИСОК ПРОЕКТОВ:');
      for (let i = 0; i < projectLinks.length; i++) {
        try {
          const href = await projectLinks[i].getAttribute('href');
          const text = await projectLinks[i].textContent();
          console.log(`   ${i + 1}. ${text?.trim()} - ${href}`);
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }
    
    // Ищем проект по имени или REF
    console.log(`\n🔍 Ищу проект "${PROJECT_NAME}" или REF: ${PROJECT_REF}...`);
    
    // Сначала ищем по имени
    let projectLink = page.locator(`text=${PROJECT_NAME}, a:has-text("${PROJECT_NAME}")`).first();
    if (!(await projectLink.isVisible({ timeout: 2000 }).catch(() => false))) {
      // Если не нашли по имени, ищем по REF
      projectLink = page.locator(`a[href*="${PROJECT_REF}"], [data-project-ref="${PROJECT_REF}"]`).first();
    }
    
    if (await projectLink.isVisible({ timeout: 5000 })) {
      console.log('✅ Проект найден! Кликаю...');
      await projectLink.click();
      await page.waitForTimeout(3000);
      
      // Проверяем URL проекта
      const currentUrl = page.url();
      console.log(`📍 Текущий URL: ${currentUrl}`);
      
      // Извлекаем правильный URL проекта
      const urlMatch = currentUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (urlMatch) {
        const actualRef = urlMatch[1];
        console.log(`\n✅ НАЙДЕН ПРАВИЛЬНЫЙ URL ПРОЕКТА:`);
        console.log(`   https://${actualRef}.supabase.co`);
        console.log(`\n📋 Обновите src/lib/supabase.ts с новым URL`);
      }
      
      // Делаем скриншот
      await page.screenshot({ path: 'supabase-project-status.png', fullPage: true });
      console.log('📸 Скриншот сохранен: supabase-project-status.png');
      
    } else {
      console.log('❌ Проект не найден в списке');
      console.log('📸 Делаю скриншот текущей страницы...');
      await page.screenshot({ path: 'supabase-dashboard.png', fullPage: true });
      
      // Пробуем найти любой проект и кликнуть на него для получения URL
      if (projectLinks.length > 0) {
        console.log('\n🔍 Пробую открыть первый проект для проверки структуры URL...');
        try {
          await projectLinks[0].click();
          await page.waitForTimeout(3000);
          const currentUrl = page.url();
          console.log(`📍 URL открытого проекта: ${currentUrl}`);
          
          const urlMatch = currentUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
          if (urlMatch) {
            console.log(`\n💡 Формат URL проекта: https://[REF].supabase.co`);
            console.log(`   REF проекта: ${urlMatch[1]}`);
          }
        } catch (e) {
          console.log('⚠️ Не удалось открыть проект:', e.message);
        }
      }
    }

    // Выводим финальный URL
    const finalUrl = page.url();
    console.log(`\n📍 Финальный URL: ${finalUrl}`);
    
    // Пробуем извлечь REF из URL
    const urlMatch = finalUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (urlMatch) {
      const actualRef = urlMatch[1];
      console.log(`\n✅ НАЙДЕН REF ПРОЕКТА В URL:`);
      console.log(`   REF: ${actualRef}`);
      console.log(`   URL: https://${actualRef}.supabase.co`);
      console.log(`\n📋 Если это правильный проект, обновите src/lib/supabase.ts:`);
      console.log(`   const supabaseUrl = 'https://${actualRef}.supabase.co'`);
    }
    
    // Ждем для ручной проверки
    console.log('\n⏸️ Ожидание 60 секунд для ручной проверки...');
    console.log('   Проверьте скриншот: supabase-dashboard.png');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await page.screenshot({ path: 'supabase-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

checkSupabaseStatus().catch(console.error);

