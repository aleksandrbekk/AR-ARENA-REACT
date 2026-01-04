import puppeteer from 'puppeteer';
import fs from 'fs';

const SQL = fs.readFileSync('./APPLY_GIVEAWAY_FUNCTIONS.sql', 'utf8');

async function main() {
  console.log('Connecting to running browser...');

  // Launch new browser - we need fresh one since old one has typed garbage
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // Grant clipboard permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('https://supabase.com', ['clipboard-read', 'clipboard-write']);

  console.log('Going to Supabase SQL editor...');
  await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 3000));

  if (page.url().includes('sign-in')) {
    console.log('Need to login, clicking GitHub...');

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
      console.log('Clicked GitHub');
      await new Promise(r => setTimeout(r, 5000));

      if (page.url().includes('github.com')) {
        console.log('On GitHub, entering credentials...');
        await page.waitForSelector('#login_field', { timeout: 10000 });
        await page.type('#login_field', 'aleksandrbekk@bk.ru', { delay: 30 });
        await page.type('#password', 'xYrsyp-6jyhgy-gubjyc', { delay: 30 });
        await page.click('input[type="submit"]');
        console.log('Submitted');
        await new Promise(r => setTimeout(r, 8000));
      }
    }

    // Navigate to SQL editor after login
    await new Promise(r => setTimeout(r, 3000));
    if (!page.url().includes('/sql/')) {
      await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('URL:', page.url());

  if (page.url().includes('/sql')) {
    console.log('In SQL editor, pasting SQL via clipboard...');
    await new Promise(r => setTimeout(r, 2000));

    // Write SQL to clipboard using page.evaluate
    await page.evaluate(async (sql) => {
      await navigator.clipboard.writeText(sql);
    }, SQL);
    console.log('SQL copied to clipboard');

    // Click on editor
    await page.evaluate(() => {
      const editor = document.querySelector('.monaco-editor .view-lines');
      if (editor) editor.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Select all
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await new Promise(r => setTimeout(r, 200));

    // Paste from clipboard
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyV');
    await page.keyboard.up('Meta');
    console.log('Pasted SQL');

    await new Promise(r => setTimeout(r, 2000));

    // Click Run button
    const runClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim();
        if (text === 'Run' || text === 'RUN') {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log('Run clicked:', runClicked);

    await new Promise(r => setTimeout(r, 5000));
    console.log('DONE! Browser open, check results.');
  }

  // Keep browser open
  await new Promise(() => {});
}

main().catch(console.error);
