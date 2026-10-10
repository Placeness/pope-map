// usage: node shot.js outdir scenario[,scenario...]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const which = (process.argv[3] || 'all').split(',');
const base = 'http://127.0.0.1:8765/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const scenarios = {
  'd-welcome': { vp: 'desk', run: async p => {} },
  'd-closed': { vp: 'desk', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(700); } },
  'd-list': { vp: 'desk', run: async p => { await p.click('.primary-nav [data-action="list"]'); await sleep(500); } },
  'd-profile-rome': { vp: 'desk', run: async p => { await p.goto(base + '#/pope/64'); await sleep(1600); } },
  'd-profile-more': { vp: 'desk', run: async p => { await p.goto(base + '#/pope/147'); await sleep(1400); await p.click('.more > summary'); await sleep(300); } },
  'd-group': { vp: 'desk', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(600); await p.click('.pg'); await sleep(900); } },
  'd-tour': { vp: 'desk', run: async p => { await p.click('.tour-controls [data-action="tour-start"]'); await sleep(1500); } },
  'd-tour-hover': { vp: 'desk', run: async p => { await p.click('.tour-controls [data-action="tour-start"]'); await sleep(1200); const b = await p.$('#rail'); const r = await b.boundingBox(); await p.mouse.move(r.x + r.width * 0.75, r.y + r.height / 2); await sleep(300); } },
  'd-saints': { vp: 'desk', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(500); await p.click('[data-mode="saints"]'); await sleep(900); } },
  'd-antipopes': { vp: 'desk', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(500); await p.click('[data-mode="antipopes"]'); await sleep(1400); } },
  'd-overview': { vp: 'desk', run: async p => { await p.click('.primary-nav [data-action="overview"]'); await sleep(700); } },
  'm-resources': { vp: 'mob', run: async p => { await p.click('.panel [data-action="close"]'); await new Promise(r=>setTimeout(r,500)); await p.click('#resources-toggle'); await new Promise(r=>setTimeout(r,500)); } },
  'd-resources': { vp: 'desk', run: async p => { await p.click('#resources-toggle'); await sleep(500); } },
  'm-welcome': { vp: 'mob', run: async p => {} },
  'm-map': { vp: 'mob', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(700); } },
  'm-list': { vp: 'mob', run: async p => { await p.click('.primary-nav [data-action="list"]'); await sleep(500); } },
  'm-profile': { vp: 'mob', run: async p => { await p.goto(base + '#/pope/264'); await sleep(1400); } },
  'm-back': { vp: 'mob', run: async p => { await p.goto(base + '#/pope/264'); await sleep(1200); await p.click('[data-action="back-map"]'); await sleep(900); } },
  'm-tour': { vp: 'mob', run: async p => { await p.click('.panel [data-action="close"]'); await sleep(500); await p.click('.tour-controls [data-action="tour-start"]'); await sleep(1400); } },
  'm-overview': { vp: 'mob', run: async p => { await p.click('.primary-nav [data-action="overview"]'); await sleep(700); } },
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, sc] of Object.entries(scenarios)) {
    if (!which.includes('all') && !which.includes(name)) continue;
    const ctx = await browser.newContext(sc.vp === 'desk'
      ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
      : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await page.goto(base);
    await sleep(1500);
    try { await sc.run(page); } catch (e) { errors.push(name + ' run: ' + e.message.split('\n')[0]); }
    await page.screenshot({ path: `${out}/${name}.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no errors');
})();
