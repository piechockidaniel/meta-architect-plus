import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';

test('focused carousel: real pointer journey, both axes, explicit selection and export', { timeout: 180_000 }, async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1189, height: 1000 } });
  // Explicit fixtures: no provider calls, microphone permissions, or speech service.
  await page.route('**/api/ai/status', route => route.fulfill({ json: { available: true } }));
  let qualificationCalls = 0;
  await page.route('**/api/ai/assist', route => {
    qualificationCalls++;
    const request = route.request().postDataJSON();
    assert.equal(request.action, 'qualify'); assert.equal(request.key, 'usage'); assert.equal(request.consent, true);
    return route.fulfill({ json: { version: request.version, result: { summary: 'Growth', suggestions: [{ field: 'usage', value: 'growth', quote: 'growth', reason: 'Captured answer' }], questions: [] } } });
  });
  const errors: string[] = [];
  let spatialMarkLoaded = false;
  page.on('response', response => { if (response.url().endsWith('/assets/branding/app-mark-spatial.svg') && response.status() === 200) spatialMarkLoaded = true; });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const read = () => page.evaluate(() => (window as any).__architectureTest.read());
  const click = async (id: string) => {
    await page.waitForFunction(id => (window as any).__architectureTest.point(id, 'carousel').visible, id);
    await page.waitForTimeout(300);
    const p = await page.evaluate(id => (window as any).__architectureTest.point(id, 'carousel'), id);
    assert.ok(p.x > 0 && p.x < 1189 && p.y > 0 && p.y < 1000, `${id} outside viewport: ${JSON.stringify(p)}`);
    await page.mouse.move(p.x, p.y);
    await page.waitForFunction(id => (window as any).__architectureTest.point(id, 'carousel').hovered, id);
    await page.mouse.click(p.x, p.y, { delay: 200 });
    try { await page.waitForFunction(previous => (window as any).__architectureTest.read().actions > previous, p.actions, { timeout: 5000 }); }
    catch (error) {
      const state = await read();
      const current = await page.evaluate(id => (window as any).__architectureTest.point(id, 'carousel'), id);
      throw new Error(JSON.stringify({ id, point: p, current, step: state.focusStep, lastAction: state.lastAction, entry: state.entry?.field }), { cause: error });
    }
    assert.equal((await read()).lastAction, id);
  };
  try {
    await page.goto(`${process.env.E2E_URL}?test`);
    await page.waitForFunction(() => !!(window as any).__architectureTest);
    await page.waitForFunction(() => (window as any).__architectureTest.read().questionAiAvailable);
    assert.deepEqual((await read()).visiblePanels, ['carousel']);
    assert.equal((await read()).shelfVisible, false);
    assert.equal((await read()).decisionPulseActive, false);
    await click('fc-primary');
    for (let i = 0; i < 30 && (await read()).focusStep === 'summary'; i++) await click('fc-primary');
    assert.equal((await read()).focusStep, 'questions');
    assert.equal((await read()).question.key, 'usage');
    const initial = (await read()).snapshot;
    await click('fc-answer-1');
    assert.deepEqual((await read()).snapshot, initial);
    await click('fc-secondary');
    assert.equal((await read()).entry.field, 'answer');
    const clickKey = async (id: string) => {
      await page.waitForTimeout(300);
      const p = await page.evaluate(id => (window as any).__architectureTest.point(id, 'keyboard'), id);
      await page.mouse.move(p.x, p.y); await page.mouse.click(p.x, p.y, { delay: 100 });
      await page.waitForFunction(previous => (window as any).__architectureTest.read().actions > previous, p.actions);
    };
    for (const character of 'growth') await clickKey(`key-${character}`);
    await clickKey('entry-done');
    assert.equal(qualificationCalls, 0);
    assert.equal((await read()).focusStep, 'assist');
    await click('fc-primary');
    await page.waitForFunction(() => (window as any).__architectureTest.read().answerDraft?.state === 'proposal');
    assert.equal(qualificationCalls, 1); assert.deepEqual((await read()).snapshot, initial);
    await click('fc-primary'); assert.deepEqual((await read()).snapshot, initial);
    await click('fc-primary'); assert.equal((await read()).snapshot.inputs.usage, 'growth');
    for (let i = 0; i < 15 && (await read()).focusStep === 'questions' && (await read()).question.key !== 'deployment'; i++) await click('fc-primary');
    assert.equal((await read()).question.key, 'deployment');
    for (let index = 0; index < 5; index++) assert.equal(await page.evaluate(index => (window as any).__architectureTest.point(`fc-answer-${index}`, 'carousel').visible, index), true);
    await page.screenshot({ path: '.local/e2e/question-choices.jpg', type: 'jpeg', quality: 80 });
    for (let i = 0; i < 15 && (await read()).focusStep === 'questions'; i++) await click('fc-primary');
    assert.equal((await read()).focusStep, 'browse');
    const before = (await read()).snapshot;
    await click('fc-down'); await click('fc-right');
    assert.equal((await read()).carousel.section, 1); assert.equal((await read()).carousel.variant, 1);
    await click('fc-down'); await click('fc-left');
    assert.equal((await read()).carousel.section, 2); assert.equal((await read()).carousel.variant, 0);
    assert.deepEqual((await read()).snapshot, before);
    await click('fc-up');
    const p = await page.evaluate(() => (window as any).__architectureTest.point('fc-title', 'carousel'));
    await page.mouse.move(p.x, p.y); await page.mouse.wheel(200, 0);
    await page.waitForFunction(() => (window as any).__architectureTest.read().carousel.variant === 1);
    assert.equal((await read()).carousel.section, 1);
    await click('fc-left');
    await page.screenshot({ path: '.local/e2e/carousel-cost.jpg', type: 'jpeg', quality: 75 });
    await click('fc-menu'); await click('fc-secondary'); await click('fc-primary'); await click('fc-close');
    assert.equal((await read()).focusStep, 'browse');
    assert.deepEqual((await read()).snapshot, before);
    await click('fc-primary'); assert.equal((await read()).snapshot.selection, null);
    await click('fc-primary');
    assert.equal((await read()).focusStep, 'export'); assert.equal((await read()).snapshot.selection, 'cloud');
    assert.equal((await read()).decisionPulseActive, true);
    assert.equal(await page.locator('#app-mark-preview').getAttribute('data-decision-locked'), 'true');
    await page.waitForFunction(() => !(window as any).__architectureTest.read().decisionPulseActive);
    assert.equal((await read()).nexusOpacity, 1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#app-mark-preview .app-mark-nexus').evaluate(element => getComputedStyle(element).animationName), 'none');
    await click('fc-primary');
    await page.waitForFunction(() => (window as any).__architectureTest.read().exportState.status === 'ready');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('architecture-export-shelf-v2')!));
    assert.equal(saved.backup.selection, 'cloud');
    assert.deepEqual((await read()).visiblePanels, ['carousel']);
    assert.deepEqual(errors, []);
    assert.equal(spatialMarkLoaded, true);
  } finally { await browser.close(); }
});
