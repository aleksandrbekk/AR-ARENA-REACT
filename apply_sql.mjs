import puppeteer from 'puppeteer';
import fs from 'fs';

const SQL = fs.readFileSync('./APPLY_GIVEAWAY_FUNCTIONS.sql', 'utf8');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();

  console.log('Navigating to Supabase SQL editor...');
  await page.goto('https://supabase.com/dashboard/project/syxjkircmiwpnpagznay/sql/new', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await sleep(5000);
  console.log('Current URL:', page.url());

  // If redirected to login, wait for manual login
  if (page.url().includes('sign-in') || page.url().includes('supabase.com/dashboard/sign-in')) {
    console.log('\n>>> NEED LOGIN! Login in the browser window, then come back here <<<\n');
  }

  // Wait for editor
  console.log('Waiting for SQL editor to load...');
  await sleep(3000);

  // Keep browser open for manual interaction
  console.log('\nBrowser is open. Paste SQL manually if needed.');
  console.log('SQL file: APPLY_GIVEAWAY_FUNCTIONS.sql');

  // Don't close
  await new Promise(() => {});
}

main().catch(console.error);
