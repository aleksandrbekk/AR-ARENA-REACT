import { chromium } from 'playwright';
import { readFileSync } from 'fs';

(async () => {
  const browser = await chromium.launch({
    headless: false, // Show browser for debugging
    slowMo: 500 // Slow down operations
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Supabase SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for login if needed
    console.log('Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Check if we need to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
      console.log('⚠️  Login required! Please login to Supabase in the browser window.');
      console.log('After logging in, the script will continue automatically...');

      // Wait for navigation to SQL editor after login
      await page.waitForURL('**/sql/**', { timeout: 120000 });
      console.log('✓ Login successful!');
    }

    // Wait for SQL editor to load
    console.log('Waiting for SQL editor...');
    await page.waitForTimeout(2000);

    // Find the SQL editor textarea/CodeMirror
    // Try different selectors for the SQL editor
    const editorSelectors = [
      '.monaco-editor textarea',
      '[data-testid="sql-editor"]',
      'textarea[placeholder*="SQL"]',
      '.CodeMirror textarea',
      'textarea.inputarea'
    ];

    let editor = null;
    for (const selector of editorSelectors) {
      try {
        editor = await page.locator(selector).first();
        if (await editor.isVisible({ timeout: 2000 })) {
          console.log(`Found editor with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!editor) {
      console.log('Could not find SQL editor. Taking screenshot...');
      await page.screenshot({ path: 'supabase-page.png', fullPage: true });
      throw new Error('SQL editor not found');
    }

    // Read SQL from file
    const sql = readFileSync('/Users/aleksandrbekk/Desktop/AR-ARENA-REACT/create_add_ar_balance.sql', 'utf8');
    console.log('SQL to execute:');
    console.log(sql);

    // Click in editor and paste SQL
    console.log('Inserting SQL into editor...');
    await editor.click();
    await page.keyboard.press('Meta+A'); // Select all
    await page.keyboard.type(sql, { delay: 10 });

    await page.waitForTimeout(1000);

    // Find and click Run button
    console.log('Looking for Run button...');
    const runButtonSelectors = [
      'button:has-text("Run")',
      'button[aria-label*="Run"]',
      '[data-testid="run-sql"]',
      'button >> text=/^Run$/i'
    ];

    let runButton = null;
    for (const selector of runButtonSelectors) {
      try {
        runButton = await page.locator(selector).first();
        if (await runButton.isVisible({ timeout: 1000 })) {
          console.log(`Found Run button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!runButton) {
      console.log('Could not find Run button. Taking screenshot...');
      await page.screenshot({ path: 'supabase-editor.png', fullPage: true });
      throw new Error('Run button not found');
    }

    console.log('Executing SQL...');
    await runButton.click();

    // Wait for execution result
    await page.waitForTimeout(3000);

    // Check for success/error message
    const successSelectors = [
      'text=/success/i',
      'text=/completed/i',
      '[role="alert"]:has-text("Success")',
      '.success'
    ];

    const errorSelectors = [
      'text=/error/i',
      '[role="alert"]:has-text("Error")',
      '.error'
    ];

    let result = 'Unknown';
    for (const selector of successSelectors) {
      try {
        const elem = await page.locator(selector).first();
        if (await elem.isVisible({ timeout: 1000 })) {
          result = 'Success';
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (result === 'Unknown') {
      for (const selector of errorSelectors) {
        try {
          const elem = await page.locator(selector).first();
          if (await elem.isVisible({ timeout: 1000 })) {
            result = 'Error';
            const errorText = await elem.textContent();
            console.log('Error message:', errorText);
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    console.log('\nExecution result:', result);

    // Take screenshot of result
    await page.screenshot({ path: 'supabase-result.png', fullPage: true });
    console.log('Screenshot saved to supabase-result.png');

    if (result === 'Success' || result === 'Unknown') {
      console.log('\n✓ SQL appears to have executed successfully!');
      console.log('\nVerifying function creation...');

      // Clear editor and run verification query
      await editor.click();
      await page.keyboard.press('Meta+A');
      await page.keyboard.type("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'add_ar_balance';", { delay: 10 });

      await page.waitForTimeout(1000);
      await runButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'supabase-verification.png', fullPage: true });
      console.log('Verification screenshot saved to supabase-verification.png');
    } else {
      console.error('\n✗ SQL execution failed!');
    }

    console.log('\nKeeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'supabase-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
