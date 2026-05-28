import puppeteer from 'puppeteer-core';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. MOBILE 320PX VIEWPORT SCREENSHOT
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 320, height: 844, isMobile: true, hasTouch: true });
  console.log('Navigating to http://localhost:5176/ (Mobile 320px View)...');
  await page1.goto('http://localhost:5176/', { waitUntil: 'networkidle2' });
  const mobile320Path = '/Users/ondrejzeman/.gemini/antigravity-ide/brain/e727c531-3e58-4b93-8944-c65c7fd2ba0f/homepage_mobile_320.png';
  await page1.screenshot({ path: mobile320Path, fullPage: true });
  console.log(`Mobile 320px screenshot saved to: ${mobile320Path}`);
  await page1.close();

  // 2. MOBILE 650PX VIEWPORT SCREENSHOT (max mobile breakpoint)
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 650, height: 1000, isMobile: true, hasTouch: true });
  console.log('Navigating to http://localhost:5176/ (Mobile 650px View)...');
  await page2.goto('http://localhost:5176/', { waitUntil: 'networkidle2' });
  const mobile650Path = '/Users/ondrejzeman/.gemini/antigravity-ide/brain/e727c531-3e58-4b93-8944-c65c7fd2ba0f/homepage_mobile_650.png';
  await page2.screenshot({ path: mobile650Path, fullPage: true });
  console.log(`Mobile 650px screenshot saved to: ${mobile650Path}`);
  await page2.close();

  // 3. MOBILE DRAWER SCREENSHOT
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  console.log('Navigating to http://localhost:5176/ and opening Mobile Drawer...');
  await page3.goto('http://localhost:5176/', { waitUntil: 'networkidle2' });
  await page3.click('button[title="Menu"]');
  await new Promise(r => setTimeout(r, 500)); // wait for slide animation
  const mobileDrawerPath = '/Users/ondrejzeman/.gemini/antigravity-ide/brain/e727c531-3e58-4b93-8944-c65c7fd2ba0f/drawer_mobile.png';
  await page3.screenshot({ path: mobileDrawerPath });
  console.log(`Mobile drawer screenshot saved to: ${mobileDrawerPath}`);
  await page3.close();

  // 4. DESKTOP DRAWER SCREENSHOT
  const page4 = await browser.newPage();
  await page4.setViewport({ width: 1280, height: 800 });
  console.log('Navigating to http://localhost:5176/ and opening Desktop Drawer...');
  await page4.goto('http://localhost:5176/', { waitUntil: 'networkidle2' });
  await page4.click('button[title="Více informací"]');
  await new Promise(r => setTimeout(r, 500)); // wait for slide animation
  const desktopDrawerPath = '/Users/ondrejzeman/.gemini/antigravity-ide/brain/e727c531-3e58-4b93-8944-c65c7fd2ba0f/drawer_desktop.png';
  await page4.screenshot({ path: desktopDrawerPath });
  console.log(`Desktop drawer screenshot saved to: ${desktopDrawerPath}`);
  await page4.close();

  // 5. DESKTOP HOMEPAGE SCREENSHOT
  const page5 = await browser.newPage();
  await page5.setViewport({ width: 1280, height: 800 });
  console.log('Navigating to http://localhost:5176/ (Desktop View)...');
  await page5.goto('http://localhost:5176/', { waitUntil: 'networkidle2' });
  const desktopHomePath = '/Users/ondrejzeman/.gemini/antigravity-ide/brain/e727c531-3e58-4b93-8944-c65c7fd2ba0f/homepage_desktop.png';
  await page5.screenshot({ path: desktopHomePath, fullPage: true });
  console.log(`Desktop homepage screenshot saved to: ${desktopHomePath}`);
  await page5.close();

  await browser.close();
}

run().catch(console.error);
