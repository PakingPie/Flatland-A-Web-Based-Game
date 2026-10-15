// Real browser, native storage, isolated profile. No adapter or normal user saves.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const bundled = process.env.FLATLAND_NODE_MODULES;
const { chromium } = bundled ? createRequire(path.join(bundled, '_resolve.cjs'))('playwright') : require('playwright');
const output = path.resolve('output/playwright');
fs.mkdirSync(output, { recursive: true });
const profile = fs.mkdtempSync(path.join(output, 'profile-'));
let url = process.env.FLATLAND_URL;
(async () => {
    const server = require('node:http').createServer((req, res) => { res.setHeader('Content-Type','text/html'); res.end(fs.readFileSync('the-flatland.html')); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url ||= `http://127.0.0.1:${server.address().port}/the-flatland.html?debug=1`;
    let context;
    const errors = [];
    const open = async () => {
        context = await chromium.launchPersistentContext(profile, { headless: true, executablePath: process.env.FLATLAND_CHROMIUM || undefined, viewport: { width: 1440, height: 900 } });
        const page = context.pages()[0];
        page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        await page.goto(url);
        await page.waitForFunction(() => !!window.FlatlandDebug);
        return page;
    };
    try {
        let page = await open();
        await page.getByRole('button', { name: 'Begin new expedition' }).click();
        await page.evaluate(() => { FlatlandDebug.manual(); FlatlandDebug.advance(2); });
        const before = await page.evaluate(() => { FlatlandDebug.pause(); return FlatlandDebug.exportSave(); });
        assert.equal(await page.evaluate(() => FlatlandDebug.save()), true);
        await context.close(); context = null;
        page = await open();
        await page.getByRole('button', { name: 'Continue saved expedition' }).click();
        const after = await page.evaluate(() => { FlatlandDebug.manual(); return FlatlandDebug.exportSave(); });
        assert.deepEqual(JSON.parse(after).payload, JSON.parse(before).payload);
        await page.screenshot({ path: path.join(output, 'baseline.png') });
        assert.deepEqual(errors, []);
        console.log('PASS native manual save / browser shutdown / Continue: exact payload');
    } finally { if (context) await context.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
