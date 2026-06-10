const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  
  await page.goto('http://127.0.0.1:9292/products/audemars-piguet-white-dial-watch', { waitUntil: 'networkidle' });
  
  console.log('Page loaded. Checking buttons...');
  
  const leftBtn = await page.$('.ipod-left');
  const rightBtn = await page.$('.ipod-right-btn');
  const xBtn = await page.$('.ipod-center-close-btn');
  
  console.log('Left btn exists?', !!leftBtn);
  console.log('X btn exists?', !!xBtn);
  
  // Inject a listener to see if the button receives the click
  await page.evaluate(() => {
    window.clickedTarget = null;
    document.addEventListener('click', (e) => {
      console.log('Clicked element:', e.target.tagName, e.target.className);
      window.clickedTarget = e.target;
    });
  });
  
  // Try to click the left arrow visual
  console.log('Clicking left button SVG...');
  await page.click('.ipod-left svg:last-child');
  
  await page.waitForTimeout(1000);
  
  console.log('Clicking X button...');
  await page.click('.ipod-center-close-btn');
  
  await page.waitForTimeout(2000);
  console.log('Current URL after clicks:', page.url());
  
  await browser.close();
})();
