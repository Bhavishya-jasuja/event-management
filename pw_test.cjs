const { chromium } = require('./node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.goto('http://localhost:3000/venues');
  await p.waitForTimeout(3000);
  await p.screenshot({ path: 'pw_venues.png', fullPage: true });
  const resp = await p.request.get('http://localhost:3000/api/venues');
  const data = await resp.json();
  console.log('API venues:', data.length);
  if (data.length > 0) {
    await p.goto('http://localhost:3000/venues/' + data[0].id);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: 'pw_detail.png', fullPage: true });
    console.log('Detail captured for:', data[0].name);
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
