import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

test('merged runtime: keyboard, rich engine, rationale, local export, tour restoration and deletion', { timeout: 180_000 }, async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1189, height: 1000 } });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const read = () => page.evaluate(() => (window as any).__architectureTest.read());
  const click = async (id: string, panel = 'decision') => {
    await page.waitForFunction(({ id, panel }) => (window as any).__architectureTest.point(id, panel).visible, { id, panel });
    // UI state can change before the next layout frame updates target positions.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(300);
    const p = await page.evaluate(({ id, panel }) => (window as any).__architectureTest.point(id, panel), { id, panel });
    assert.ok(p.x > 0 && p.x < 1189 && p.y > 0 && p.y < 1000, `${id} outside default viewport: ${JSON.stringify(p)}`);
    await page.mouse.move(p.x, p.y);
    await page.waitForFunction(({ id, panel }) => (window as any).__architectureTest.point(id, panel).hovered, { id, panel });
    await page.mouse.click(p.x, p.y, { delay: 100 });
    try {
      await page.waitForFunction(previous => (window as any).__architectureTest.read().actions > previous, p.actions, { timeout: 5000 });
      assert.equal((await read()).lastAction, id, 'Actual clicked control must match the intended target');
    } catch (error) {
      const state = await read();
      const current = await page.evaluate(({ id, panel }) => (window as any).__architectureTest.point(id, panel), { id, panel });
      throw new Error(JSON.stringify({ id, point: p, current, stage: state.stage, lastAction: state.lastAction, actions: state.actions, entry: state.entry?.field, title: state.context.title, inputs: state.snapshot.inputs, assessments: state.snapshot.assessments.map((a: any) => ({ id: a.variant.id, state: a.state })) }), { cause: error });
    }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const type = async (field: string, text: string) => {
    await click(`dp-edit-${field}`); await click('entry-clear', 'keyboard');
    for (const ch of text) await click(`key-${ch}`, 'keyboard');
    await click('entry-done', 'keyboard');
    await page.waitForFunction(() => !(window as any).__architectureTest.read().entry);
  };
  try {
    await page.goto(`${process.env.E2E_URL}?test&classic`);
    await page.waitForFunction(() => !!(window as any).__architectureTest);
    await click('dp-start'); await type('title', 'crm');
    assert.equal((await read()).context.title, 'crm');
    await click('dp-workload-storage');
    assert.deepEqual((await read()).snapshot.inputs.workload, ['storage']);
    await click('dp-edit-title'); await click('entry-clear', 'keyboard');
    await page.screenshot({ path: '.local/e2e/merged-keyboard.jpg', type: 'jpeg', quality: 70 });
    await click('entry-cancel', 'keyboard');
    assert.equal((await read()).context.title, 'crm');
    await type('hosting', '1'); assert.equal((await read()).snapshot.inputs.rates, null);
    await type('site', '0'); await type('connectivity', '2');
    assert.deepEqual((await read()).snapshot.inputs.rates, { hosting: 1, site: 0, connectivity: 2 });
    await click('dp-confirm'); await click('dp-stage-review'); await click('dp-select-cloud');
    await type('rationale', 'why');
    assert.equal((await read()).snapshot.selection, 'cloud');
    assert.equal((await read()).context.rationale, 'why');
    assert.equal((await read()).snapshot.inputs.identity, 'application');
    await click('cp-tour', 'controls'); await click('dp-tour-exit');
    assert.equal((await read()).context.title, 'crm'); assert.equal((await read()).context.rationale, 'why');
    await click('dp-start'); await click('dp-stage-review'); await click('dp-export');
    await page.waitForFunction(() => (window as any).__architectureTest.read().exportState.status === 'ready');
    await page.locator('#export-drawer').waitFor({ state: 'visible' });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('architecture-export-shelf-v2')!));
    assert.equal(saved.context.rationale, 'why'); assert.equal(saved.backup.inputs.identity, 'application');
    const [download] = await Promise.all([
      page.waitForEvent('download'), page.locator('#export-drawer').getByRole('button', { name: 'Full bundle', exact: true }).click(),
    ]);
    await download.saveAs('.local/e2e/downloaded-bundle.json');
    const downloaded = JSON.parse(await readFile('.local/e2e/downloaded-bundle.json', 'utf8'));
    assert.equal(downloaded.schema, 'architecture-decision-bundle.v2');
    assert.equal(downloaded.context.rationale, 'why');
    assert.deepEqual(downloaded.backup.inputs.workload, ['storage']);
    await page.screenshot({ path: '.local/e2e/merged-review.jpg', type: 'jpeg', quality: 70 });
    await click('dp-export-delete'); await click('dp-delete-local');
    assert.equal(await page.evaluate(() => localStorage.getItem('architecture-export-shelf-v2')), null);
    assert.equal((await read()).context.title, 'crm');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
