/** Independent PR #71 QA: exact-source Chromium smoke, no deployment or HTTP navigation. */
'use strict';
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {createHash} = require('node:crypto');
const {join} = require('node:path');
const {chromium} = require('playwright');
const html = readFileSync(join(__dirname, '../projects/kidp/life-design-lab/a05/reflection-d101.html'), 'utf8');
const bytes = Buffer.from(html, 'utf8');
const gitBlob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
assert.equal(gitBlob, '9b1671873cf1c7aee6b48cfb37c4202e06f7874b', 'Reviewed HTML changed');

(async () => {
  const options = {headless: true};
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)
    options.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser = await chromium.launch(options);
  try {
    for (const width of [280, 320, 390, 820, 1280]) {
      const context = await browser.newContext({viewport: {width, height: 844}, locale: 'ja-JP'});
      const page = await context.newPage();
      const errors = [], requests = [], csp = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      page.on('console', message => {
        if (/Content Security Policy/i.test(message.text())) csp.push(message.text());
      });
      await page.setContent(html, {waitUntil: 'load'});
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('input,textarea,form').count(), 0);
      assert.equal(await page.locator('#case-picker option').count(), 8);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('skip-link')), true);
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content');
      for (let i = 0; i < 8; i++) {
        await page.locator('#case-picker').selectOption(String(i));
        assert.match(await page.locator('#case-name').innerText(), new RegExp('例' + (i + 1)));
        assert.doesNotMatch(await page.locator('#case-announcement').textContent(), /。。/);
      }
      for (let step = 2; step <= 4; step++) {
        await page.locator('#next').click();
        assert.match(await page.locator('#reflection-progress').innerText(), new RegExp(step + ' / 4'));
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'reflection-title');
      }
      assert.equal(await page.locator('#next').isDisabled(), true);
      await page.locator('#prev').click();
      assert.match(await page.locator('#reflection-progress').innerText(), /3 \/ 4/);
      await page.locator('#restart').click();
      assert.match(await page.locator('#reflection-progress').innerText(), /1 \/ 4/);
      await page.evaluate(() => {
        window.print = () => { window.__printCounter++; };
        window.__printCounter = 0;
      });
      await page.locator('#print-worksheet').click();
      assert.equal(await page.evaluate(() => window.__printCounter), 1);
      await page.emulateMedia({media: 'print'});
      assert.equal(await page.locator('#print-worksheet-page').isVisible(), true);
      assert.equal(await page.locator('#print-worksheet-page h2').count(), 4);
      assert.equal(await page.locator('#case-picker').isVisible(), false);
      await page.emulateMedia({media: 'screen'});
      for (const percent of [100, 200, 400]) {
        await page.evaluate(value => { document.documentElement.style.fontSize = value + '%'; }, percent);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
          'horizontal overflow at ' + width + 'px, text scale ' + percent + '%');
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
      assert.deepEqual(csp, []);
      console.log('D107 Chromium: PASS ' + width + 'px, cases 8, steps 4, print and text scaling');
      await context.close();
    }
    const noJs = await browser.newContext({javaScriptEnabled: false});
    const noJsPage = await noJs.newPage();
    await noJsPage.setContent(html);
    assert.equal(await noJsPage.locator('noscript').isVisible(), true);
    assert.equal(await noJsPage.locator('.banded').count(), 2);
    await noJs.close();
    const tampered = html.replace('</script>', '/* tampered */</script>');
    const page = await browser.newPage();
    const violations = [];
    page.on('console', message => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    await page.setContent(tampered);
    assert.equal(await page.locator('#case-text').innerText(), '', 'tampered script must not execute');
    assert.ok(violations.length >= 1, 'CSP violation should be reported');
    await page.close();
    console.log('D107 PASS: 5 viewports, no-JS fallback, CSP tamper refusal');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
