// Скрипт для выполнения SQL миграции события через Supabase SQL Editor
import { chromium } from 'playwright';

const SUPABASE_EMAIL = 'aleksandrbekk@bk.ru';
const SUPABASE_PASSWORD = 'xYrsyp-6jyhgy-gubjyc';
const SUPABASE_URL = 'https://syxjkircmiwpnpagznay.supabase.co';

const SQL_MIGRATION = `
-- 1. Таблица для секретного кода события
CREATE TABLE IF NOT EXISTS event_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  digit_1 smallint NOT NULL,
  digit_2 smallint NOT NULL,
  digit_3 smallint NOT NULL,
  digit_4 smallint NOT NULL,
  digit_1_revealed boolean DEFAULT false,
  digit_2_revealed boolean DEFAULT false,
  digit_3_revealed boolean DEFAULT false,
  digit_4_revealed boolean DEFAULT false,
  wheel_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Таблица участников события
CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  username text,
  code_entered boolean DEFAULT false,
  code_entered_at timestamptz,
  wheel_spun boolean DEFAULT false,
  wheel_spun_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. Таблица промокодов
CREATE TABLE IF NOT EXISTS event_promocodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent smallint NOT NULL,
  participant_id uuid REFERENCES event_participants(id),
  telegram_id bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  notified_12h boolean DEFAULT false,
  notified_1h boolean DEFAULT false
);

-- 4. RPC: Проверка кода события
CREATE OR REPLACE FUNCTION check_event_code(input_code text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_code record;
  v_digit1 smallint;
  v_digit2 smallint;
  v_digit3 smallint;
  v_digit4 smallint;
BEGIN
  SELECT * INTO v_code
  FROM event_codes
  WHERE event_date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Событие не найдено');
  END IF;
  
  IF NOT v_code.wheel_active THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Колесо неактивно');
  END IF;
  
  IF length(input_code) != 4 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Код должен содержать 4 цифры');
  END IF;
  
  v_digit1 := substring(input_code, 1, 1)::smallint;
  v_digit2 := substring(input_code, 2, 1)::smallint;
  v_digit3 := substring(input_code, 3, 1)::smallint;
  v_digit4 := substring(input_code, 4, 1)::smallint;
  
  IF v_code.digit_1 = v_digit1 AND
     v_code.digit_2 = v_digit2 AND
     v_code.digit_3 = v_digit3 AND
     v_code.digit_4 = v_digit4 THEN
    RETURN jsonb_build_object('valid', true);
  ELSE
    RETURN jsonb_build_object('valid', false, 'error', 'Неверный код');
  END IF;
END;
$$;

-- 5. RPC: Генерация промокода
CREATE OR REPLACE FUNCTION generate_event_promocode(p_telegram_id bigint, p_username text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant_id uuid;
  v_participant record;
  v_code text;
  v_discount smallint;
  v_expires_at timestamptz;
  v_random numeric;
BEGIN
  SELECT * INTO v_participant
  FROM event_participants
  WHERE telegram_id = p_telegram_id;
  
  IF FOUND AND v_participant.wheel_spun THEN
    RETURN jsonb_build_object('error', 'Пользователь уже крутил колесо');
  END IF;
  
  IF FOUND THEN
    v_participant_id := v_participant.id;
    UPDATE event_participants
    SET username = COALESCE(p_username, username),
        wheel_spun = true,
        wheel_spun_at = now()
    WHERE id = v_participant_id;
  ELSE
    INSERT INTO event_participants (telegram_id, username, wheel_spun, wheel_spun_at)
    VALUES (p_telegram_id, p_username, true, now())
    RETURNING id INTO v_participant_id;
  END IF;
  
  LOOP
    v_code := 'GIFT-' || 
              upper(substring(md5(random()::text), 1, 4)) || '-' ||
              upper(substring(md5(random()::text), 1, 4));
    
    EXIT WHEN NOT EXISTS (SELECT 1 FROM event_promocodes WHERE code = v_code);
  END LOOP;
  
  v_random := random();
  IF v_random < 0.375 THEN
    v_discount := 10;
  ELSIF v_random < 0.75 THEN
    v_discount := 15;
  ELSIF v_random < 0.875 THEN
    v_discount := 20;
  ELSE
    v_discount := 25;
  END IF;
  
  v_expires_at := now() + interval '24 hours';
  
  INSERT INTO event_promocodes (code, discount_percent, participant_id, telegram_id, expires_at)
  VALUES (v_code, v_discount, v_participant_id, p_telegram_id, v_expires_at);
  
  RETURN jsonb_build_object(
    'promocode', v_code,
    'discount_percent', v_discount,
    'expires_at', v_expires_at
  );
END;
$$;

-- 6. RPC: Получение открытых цифр
CREATE OR REPLACE FUNCTION get_revealed_digits()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_code record;
BEGIN
  SELECT * INTO v_code
  FROM event_codes
  WHERE event_date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'digit_1', null,
      'digit_2', null,
      'digit_3', null,
      'digit_4', null,
      'wheel_active', false
    );
  END IF;
  
  RETURN jsonb_build_object(
    'digit_1', CASE WHEN v_code.digit_1_revealed THEN v_code.digit_1 ELSE null END,
    'digit_2', CASE WHEN v_code.digit_2_revealed THEN v_code.digit_2 ELSE null END,
    'digit_3', CASE WHEN v_code.digit_3_revealed THEN v_code.digit_3 ELSE null END,
    'digit_4', CASE WHEN v_code.digit_4_revealed THEN v_code.digit_4 ELSE null END,
    'wheel_active', v_code.wheel_active
  );
END;
$$;

-- 7. RPC: Админ - открыть цифру
CREATE OR REPLACE FUNCTION admin_reveal_digit(digit_number smallint)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  IF digit_number < 1 OR digit_number > 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'digit_number должен быть от 1 до 4');
  END IF;
  
  SELECT id INTO v_code_id
  FROM event_codes
  WHERE event_date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Событие не найдено');
  END IF;
  
  CASE digit_number
    WHEN 1 THEN UPDATE event_codes SET digit_1_revealed = true WHERE id = v_code_id;
    WHEN 2 THEN UPDATE event_codes SET digit_2_revealed = true WHERE id = v_code_id;
    WHEN 3 THEN UPDATE event_codes SET digit_3_revealed = true WHERE id = v_code_id;
    WHEN 4 THEN UPDATE event_codes SET digit_4_revealed = true WHERE id = v_code_id;
  END CASE;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. RPC: Админ - включить/выключить колесо
CREATE OR REPLACE FUNCTION admin_toggle_wheel(is_active boolean)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  SELECT id INTO v_code_id
  FROM event_codes
  WHERE event_date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Событие не найдено');
  END IF;
  
  UPDATE event_codes SET wheel_active = is_active WHERE id = v_code_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Тестовое событие
INSERT INTO event_codes (event_date, digit_1, digit_2, digit_3, digit_4, digit_1_revealed, digit_2_revealed, digit_3_revealed, digit_4_revealed, wheel_active)
VALUES ('2025-12-22', 7, 3, 9, 2, false, false, false, false, false)
ON CONFLICT DO NOTHING;
`;

async function executeSQL() {
  console.log('🚀 Выполнение SQL миграции для события "Крипто-итоги 2025"...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Переходим в Supabase Dashboard
    console.log('📱 Открываю Supabase Dashboard...');
    await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Ищем кнопку GitHub для входа
    const githubButton = page.locator('button:has-text("GitHub"), a:has-text("GitHub")').first();
    if (await githubButton.isVisible({ timeout: 5000 })) {
      console.log('🔐 Вход через GitHub...');
      await githubButton.click();
      await page.waitForTimeout(5000);
      
      // Если перенаправило на GitHub
      if (page.url().includes('github.com')) {
        const emailInput = page.locator('input[name="login"], input[id="login_field"]');
        if (await emailInput.isVisible({ timeout: 5000 })) {
          await emailInput.fill(SUPABASE_EMAIL);
          await page.waitForTimeout(500);
          
          const passwordInput = page.locator('input[name="password"], input[id="password"]');
          if (await passwordInput.isVisible({ timeout: 3000 })) {
            await passwordInput.fill(SUPABASE_PASSWORD);
            await page.waitForTimeout(500);
            
            const signInButton = page.locator('input[name="commit"][value="Sign in"]').first();
            if (await signInButton.isVisible({ timeout: 3000 })) {
              await signInButton.click();
              await page.waitForTimeout(5000);
              
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

    // Переходим к проекту
    console.log('🔍 Ищу проект LEHA...');
    await page.waitForTimeout(3000);
    
    // Переходим напрямую к проекту
    const projectUrl = `https://supabase.com/dashboard/project/syxjkircmiwpnpagznay`;
    await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Ищем SQL Editor
    console.log('📝 Ищу SQL Editor...');
    const sqlEditorLink = page.locator('a:has-text("SQL Editor"), a[href*="sql"], button:has-text("SQL Editor")').first();
    if (await sqlEditorLink.isVisible({ timeout: 10000 })) {
      await sqlEditorLink.click();
      await page.waitForTimeout(5000);
    } else {
      // Пробуем прямой URL
      await page.goto(`${projectUrl}/sql/new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
    }

    // Ищем текстовое поле для SQL
    console.log('⌨️ Ввожу SQL запрос...');
    await page.waitForTimeout(3000);
    
    // Пробуем разные селекторы для редактора SQL
    const sqlSelectors = [
      'textarea',
      '.monaco-editor textarea',
      '[contenteditable="true"]',
      '.view-lines',
      'div[role="textbox"]'
    ];
    
    let sqlInput = null;
    for (const selector of sqlSelectors) {
      try {
        sqlInput = page.locator(selector).first();
        if (await sqlInput.isVisible({ timeout: 2000 })) {
          console.log(`✅ Найден редактор SQL (${selector})`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (sqlInput && await sqlInput.isVisible({ timeout: 5000 })) {
      await sqlInput.click();
      await page.waitForTimeout(500);
      
      // Очищаем и вводим SQL
      await page.keyboard.press('Meta+A');
      await page.waitForTimeout(200);
      await page.keyboard.type(SQL_MIGRATION, { delay: 10 });
      await page.waitForTimeout(2000);
      
      console.log('✅ SQL введен, запускаю выполнение...');
      
      // Ищем кнопку Run/Execute
      const runButton = page.locator('button:has-text("Run"), button:has-text("Execute"), button[aria-label*="Run"]').first();
      if (await runButton.isVisible({ timeout: 5000 })) {
        await runButton.click();
        console.log('⏳ Жду выполнения SQL...');
        await page.waitForTimeout(10000);
        
        // Делаем скриншот результата
        await page.screenshot({ path: 'sql-execution-result.png', fullPage: true });
        console.log('📸 Скриншот результата сохранен: sql-execution-result.png');
      }
    } else {
      console.log('⚠️ Редактор SQL не найден, делаю скриншот...');
      await page.screenshot({ path: 'sql-editor-page.png', fullPage: true });
    }

    // Выполняем проверочный запрос через REST API
    console.log('\n📊 Проверяю результат: SELECT * FROM event_codes;');
    await page.waitForTimeout(3000);
    
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eGpraXJjbWl3cG5wYWd6bmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjQ0MTEsImV4cCI6MjA3MzM0MDQxMX0.XUJWPrPOtsG_cynjfH38mJR2lJYThGTgEVMMu3MIw8g';
    
    try {
      const response = await page.evaluate(async (url, key) => {
        const res = await fetch(`${url}/rest/v1/event_codes?select=*`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (res.ok) {
          return await res.json();
        } else {
          return { error: `${res.status} ${res.statusText}` };
        }
      }, SUPABASE_URL, supabaseKey);
      
      if (response.error) {
        console.log(`❌ Ошибка: ${response.error}`);
      } else {
        console.log(`✅ Получено записей: ${response.length}`);
        if (response.length > 0) {
          console.log('\n📋 Результат SELECT * FROM event_codes:');
          response.forEach((row, i) => {
            console.log(`\n${i + 1}. Событие:`);
            console.log(`   ID: ${row.id}`);
            console.log(`   Дата: ${row.event_date}`);
            console.log(`   Код: ${row.digit_1}${row.digit_2}${row.digit_3}${row.digit_4}`);
            console.log(`   Открыто: ${row.digit_1_revealed ? row.digit_1 : '?'}${row.digit_2_revealed ? row.digit_2 : '?'}${row.digit_3_revealed ? row.digit_3 : '?'}${row.digit_4_revealed ? row.digit_4 : '?'}`);
            console.log(`   Колесо активно: ${row.wheel_active}`);
            console.log(`   Создано: ${row.created_at}`);
          });
        }
      }
    } catch (err) {
      console.log(`⚠️ Не удалось проверить через REST API: ${err.message}`);
    }
    
    console.log('\n⏸️ Ожидание 30 секунд для проверки...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await page.screenshot({ path: 'sql-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

executeSQL().catch(console.error);



