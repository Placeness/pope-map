const { chromium } = require('/opt/node-tools/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/'); await sleep(1500);
  const out = {};
  // rail keyboard
  await p.click('.tour-controls [data-action="tour-start"]'); await sleep(500);
  await p.focus('#rail'); await p.keyboard.press('End'); await sleep(400);
  out.railEnd = await p.getAttribute('#rail', 'aria-valuenow');
  out.endTitle = await p.textContent('.panel h1');
  await p.keyboard.press('Home'); await sleep(400);
  out.railHome = await p.getAttribute('#rail', 'aria-valuenow');
  await p.keyboard.press('ArrowRight'); await sleep(400);
  out.afterRight = await p.textContent('.panel h1');
  // Escape closes panel
  await p.keyboard.press('Escape'); await sleep(400);
  out.viewAfterEsc = await p.getAttribute('#panel', 'data-view');
  // keyboard on markers: focus a pin marker and press Enter
  const pin = await p.$('.leaflet-marker-icon.pm:not(.pg)');
  await pin.focus(); await p.keyboard.press('Enter'); await sleep(600);
  out.afterEnterView = await p.getAttribute('#panel', 'data-view');
  out.afterEnterName = await p.textContent('.panel h1'); out.focusAfter = await p.evaluate(() => document.activeElement.id || document.activeElement.className);
  out.markerRoles = await p.$$eval('.leaflet-marker-icon', els => els.filter(e => e.getAttribute('role') === 'button' && e.getAttribute('aria-label')).length + '/' + els.length);
  // transitions disabled under reduced motion
  out.panelTransition = await p.$eval('#panel', e => getComputedStyle(e).transitionDuration);
  // deep link
  await p.goto('http://127.0.0.1:8765/#/pope/147'); await sleep(1200);
  out.deep147 = await p.textContent('.panel h1');
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
