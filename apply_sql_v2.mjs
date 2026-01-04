import puppeteer from 'puppeteer';
import fs from 'fs';

const SQL = fs.readFileSync('./FIX_GIVEAWAY_FUNCTIONS.sql', 'utf8');

async function main() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  console.log('Going to Supabase...');
  await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 3000));

  if (page.url().includes('sign-in')) {
    console.log('Login required...');

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      const ghBtn = btns.find(b => b.textContent?.toLowerCase().includes('github'));
      if (ghBtn) ghBtn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    if (page.url().includes('github.com')) {
      console.log('GitHub login...');
      await page.waitForSelector('#login_field', { timeout: 10000 });
      await page.type('#login_field', 'aleksandrbekk@bk.ru', { delay: 20 });
      await page.type('#password', 'xYrsyp-6jyhgy-gubjyc', { delay: 20 });
      await page.click('input[type="submit"]');
      await new Promise(r => setTimeout(r, 8000));
    }

    if (!page.url().includes('/sql/')) {
      await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
        waitUntil: 'networkidle2'
      });
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('Current URL:', page.url());

  if (page.url().includes('/sql')) {
    console.log('In SQL editor, setting value via Monaco...');
    await new Promise(r => setTimeout(r, 3000));

    // Use Monaco editor's setValue directly
    const success = await page.evaluate((sql) => {
      // Find Monaco editor instance
      const editors = window.monaco?.editor?.getEditors?.();
      if (editors && editors.length > 0) {
        const editor = editors[0];
        editor.setValue(sql);
        return { method: 'monaco', success: true };
      }

      // Fallback: try to find editor model
      const model = window.monaco?.editor?.getModels?.();
      if (model && model.length > 0) {
        model[0].setValue(sql);
        return { method: 'model', success: true };
      }

      // Fallback 2: direct textarea
      const textarea = document.querySelector('textarea.inputarea');
      if (textarea) {
        textarea.focus();
        textarea.value = sql;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return { method: 'textarea', success: true };
      }

      return { method: 'none', success: false };
    }, SQL);

    console.log('Set SQL result:', success);

    if (!success.success) {
      // Fallback: send keys one by one using CDP
      console.log('Using fallback: CDP sendKeys...');

      // Click editor
      await page.evaluate(() => {
        const editor = document.querySelector('.monaco-editor .view-lines');
        if (editor) editor.click();
      });
      await new Promise(r => setTimeout(r, 500));

      // Select all and delete
      await page.keyboard.down('Meta');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Meta');
      await page.keyboard.press('Backspace');

      // Use CDP to insert text
      const client = await page.target().createCDPSession();
      await client.send('Input.insertText', { text: SQL });
      console.log('Inserted via CDP');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click Run button
    console.log('Looking for Run button...');

    const runResult = await page.evaluate(() => {
      // Try all possible selectors
      const selectors = [
        'button:contains("Run")',
        '[data-state="closed"]:has-text("Run")'
      ];

      // Manual search
      const allButtons = document.querySelectorAll('button');
      for (const btn of allButtons) {
        const text = btn.textContent?.trim() || '';
        console.log('Button:', text);
        if (text === 'Run' || text.startsWith('Run')) {
          btn.click();
          return { found: true, text };
        }
      }

      // Try keyboard shortcut
      return { found: false, shortcut: true };
    });

    console.log('Run result:', runResult);

    if (!runResult.found) {
      // Use keyboard shortcut Cmd+Enter
      console.log('Using Cmd+Enter shortcut...');
      await page.keyboard.down('Meta');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Meta');
    }

    await new Promise(r => setTimeout(r, 5000));

    // Check for success message
    const result = await page.evaluate(() => {
      const body = document.body.innerText;
      if (body.includes('Success')) return 'SUCCESS';
      if (body.includes('error') || body.includes('Error')) {
        const match = body.match(/error[:\s]+([^\n]+)/i);
        return 'ERROR: ' + (match ? match[1] : 'unknown');
      }
      return 'UNKNOWN';
    });

    console.log('Execution result:', result);
  }

  console.log('Done! Browser open.');
  await new Promise(() => {});
}

main().catch(console.error);
