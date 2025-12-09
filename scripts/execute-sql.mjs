import { chromium } from 'playwright';

async function checkCronJobs() {
  console.log('Connecting to browser...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  
  const context = contexts[0];
  const pages = context.pages();
  let supabasePage = pages.find(p => p.url().includes('supabase.com'));
  
  if (!supabasePage) {
    console.log('Supabase page not found');
    await browser.close();
    return;
  }

  console.log('Found page');

  await supabasePage.keyboard.press('Escape');
  await supabasePage.waitForTimeout(500);

  // Check cron jobs
  const sqlCode = `SELECT * FROM cron.job;`;

  await supabasePage.click('.view-lines', { force: true, timeout: 3000 });
  await supabasePage.waitForTimeout(300);
  
  await supabasePage.keyboard.press('Meta+A');
  await supabasePage.keyboard.press('Backspace');
  await supabasePage.waitForTimeout(300);
  
  console.log('Checking cron jobs...');
  await supabasePage.keyboard.type(sqlCode, { delay: 1 });
  await supabasePage.waitForTimeout(300);
  
  await supabasePage.click('button:has-text("Run")', { force: true, timeout: 3000 });
  await supabasePage.waitForTimeout(3000);
  
  await supabasePage.screenshot({ path: '/Users/aleksandrbekk/Desktop/AR-ARENA-REACT/cron_check.png' });
  console.log('Screenshot saved to cron_check.png');
  
  await browser.close();
  console.log('Done!');
}

checkCronJobs().catch(e => console.error('Error:', e.message));
