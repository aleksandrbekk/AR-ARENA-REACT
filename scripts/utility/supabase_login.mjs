import puppeteer from 'puppeteer';
import fs from 'fs';

const SQL = fs.readFileSync('./APPLY_GIVEAWAY_FUNCTIONS.sql', 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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
    waitUntil: 'networkidle0',
    timeout: 60000
  });

  await sleep(3000);
  const url = page.url();
  console.log('URL:', url);

  if (url.includes('sign-in')) {
    console.log('Need to login via GitHub...');

    // Find GitHub button by evaluating page content
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.toLowerCase().includes('github')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      console.log('Clicked GitHub button');
    } else {
      console.log('GitHub button not found, trying alternative...');
      // Try clicking any OAuth button
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        if (btns.length > 0) btns[0].click();
      });
    }

    await sleep(5000);
    console.log('After click URL:', page.url());

    // Check if on GitHub
    if (page.url().includes('github.com')) {
      console.log('On GitHub login page. Entering credentials...');

      await page.waitForSelector('#login_field', { timeout: 10000 });
      await page.type('#login_field', 'aleksandrbekk@bk.ru', { delay: 50 });
      await sleep(300);

      await page.type('#password', 'xYrsyp-6jyhgy-gubjyc', { delay: 50 });
      await sleep(300);

      await page.click('input[type="submit"]');
      console.log('Submitted login form');

      await sleep(8000);
      console.log('After login URL:', page.url());

      // Check for 2FA or authorize page
      if (page.url().includes('authorize') || page.url().includes('oauth')) {
        console.log('Authorization page detected, clicking authorize...');
        const authorizeClicked = await page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"], input[type="submit"]');
          if (btn) { btn.click(); return true; }
          return false;
        });
        await sleep(5000);
      }
    }

    // Wait for redirect to Supabase
    await sleep(5000);
    console.log('Final URL:', page.url());
  }

  // Navigate to SQL editor if not there
  if (!page.url().includes('/sql/')) {
    console.log('Navigating to SQL editor...');
    await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    await sleep(3000);
  }

  console.log('Current URL:', page.url());

  if (page.url().includes('/sql')) {
    console.log('In SQL editor! Pasting SQL...');
    await sleep(2000);

    // Click in the editor area
    const editorClicked = await page.evaluate(() => {
      const editor = document.querySelector('.monaco-editor, .view-lines, [role="textbox"], textarea');
      if (editor) {
        editor.click();
        editor.focus();
        return true;
      }
      return false;
    });
    console.log('Editor clicked:', editorClicked);

    await sleep(500);

    // Select all and paste
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await sleep(200);

    // Type SQL directly
    console.log('Typing SQL (this may take a moment)...');
    await page.keyboard.type(SQL, { delay: 0 });

    console.log('SQL entered!');
    await sleep(1000);

    // Click Run button
    const runClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent && btn.textContent.trim() === 'Run') {
          btn.click();
          return true;
        }
      }
      // Try data-testid
      const runBtn = document.querySelector('[data-testid="sql-run-button"]');
      if (runBtn) { runBtn.click(); return true; }
      return false;
    });

    if (runClicked) {
      console.log('Clicked Run button!');
    } else {
      console.log('Run button not found. Please click manually.');
    }

    await sleep(5000);
    console.log('DONE! Check browser for results.');
  }

  console.log('Keeping browser open...');
  await new Promise(() => {});
}

main().catch(e => {
  console.error('Error:', e.message);
});
