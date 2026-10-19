import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { applyKey, beginEntry, caretDisplay, entryHint, parseNumericEntry } from '../src/text-entry.js';

const type = (text: string, start = beginEntry('title', 'Product name', 'text', '')) =>
  text.split('').reduce((state, ch) => applyKey(state, ch === ' ' ? { type: 'space' } : { type: 'char', value: ch }), start);

test('text mode types characters, spaces and deletes one code point at a time', () => {
  let state = type('Hi there');
  assert.equal(state.value, 'Hi there');
  state = applyKey(state, { type: 'backspace' });
  assert.equal(state.value, 'Hi ther');
  state = applyKey({ ...state, value: 'e\u{1F600}' }, { type: 'backspace' });
  assert.equal(state.value, 'e', 'backspace removes a whole astral code point, not half a surrogate pair');
  assert.equal(applyKey(beginEntry('t', 'T', 'text', ''), { type: 'backspace' }).value, '', 'backspace on empty is a no-op');
});

test('shift upper-cases exactly one following letter and is shown in the hint', () => {
  let state = applyKey(beginEntry('title', 'Product name', 'text', ''), { type: 'shift' });
  assert.equal(state.shift, true);
  assert.equal(entryHint(state), 'Shift: next letter upper case.');
  state = applyKey(state, { type: 'char', value: 'a' });
  assert.equal(state.value, 'A');
  assert.equal(state.shift, false);
  state = applyKey(state, { type: 'char', value: 'b' });
  assert.equal(state.value, 'Ab');
  assert.equal(applyKey(applyKey(state, { type: 'shift' }), { type: 'shift' }).shift, false, 'shift toggles off again');
});

test('clear empties the value and resets shift', () => {
  const state = applyKey(applyKey(type('abc'), { type: 'shift' }), { type: 'clear' });
  assert.deepEqual([state.value, state.shift], ['', false]);
});

test('numeric mode accepts only digits and a point; space and letters are ignored', () => {
  let state = beginEntry('budget', 'Budget', 'numeric', '');
  for (const key of ['1', 'a', '2', ' ', ',', '.', '5', '-', '/', 'e']) state = applyKey(state, key === ' ' ? { type: 'space' } : { type: 'char', value: key });
  assert.equal(state.value, '12.5', 'comma, dash, slash, letters and space are all ignored in numeric mode');
  assert.equal(applyKey(state, { type: 'shift' }).shift, true, 'shift state still toggles but has no effect on digits');
  assert.equal(applyKey(applyKey(state, { type: 'shift' }), { type: 'char', value: '7' }).value, '12.57');
});

test('maximum length is enforced in code points and initial values are truncated', () => {
  const state = beginEntry('title', 'Product name', 'text', 'abcdef', { maxLength: 4 });
  assert.equal(state.value, 'abcd');
  assert.equal(applyKey(state, { type: 'char', value: 'x' }).value, 'abcd');
  assert.equal(applyKey(state, { type: 'space' }).value, 'abcd');
  assert.equal(beginEntry('budget', 'Budget', 'numeric', '').maxLength, 18);
  assert.equal(beginEntry('specification', 'Spec', 'text', '').maxLength, 16000);
});

test('control characters and multi-character keys are rejected', () => {
  const state = beginEntry('title', 'Product name', 'text', '');
  assert.equal(applyKey(state, { type: 'char', value: '\u0007' }).value, '');
  assert.equal(applyKey(state, { type: 'char', value: 'ab' }).value, '');
  assert.equal(applyKey(state, { type: 'char', value: '' }).value, '');
});

test('caret display and remaining-character hint', () => {
  const state = beginEntry('title', 'Product name', 'text', 'abc', { maxLength: 10 });
  assert.equal(caretDisplay(state), 'abc|');
  assert.equal(caretDisplay(state, '_'), 'abc_');
  assert.equal(entryHint(state), '7 characters left.');
  assert.equal(entryHint(beginEntry('s', 'S', 'text', '')), 'Select keys to type. Done applies, Cancel discards.');
  assert.equal(entryHint(beginEntry('b', 'B', 'numeric', '1')), 'Digits and one decimal point. Leave empty to clear the value.');
});

test('numeric parsing: empty clears, valid forms parse, malformed and out-of-range are rejected', () => {
  assert.deepEqual(parseNumericEntry(''), { ok: true, value: null });
  assert.deepEqual(parseNumericEntry('  '), { ok: true, value: null });
  assert.deepEqual(parseNumericEntry('120'), { ok: true, value: 120 });
  assert.deepEqual(parseNumericEntry('99.50'), { ok: true, value: 99.5 });
  assert.deepEqual(parseNumericEntry('.5'), { ok: true, value: 0.5 });
  assert.deepEqual(parseNumericEntry('7.'), { ok: true, value: 7 });
  assert.deepEqual(parseNumericEntry('0'), { ok: true, value: 0 });
  for (const bad of ['1.2.3', '.', '-1', '1e5', 'abc']) assert.equal(parseNumericEntry(bad).ok, false, bad);
  assert.equal(parseNumericEntry('1000000000001').ok, false, 'above the engine limit of 1e12');
  const reason = parseNumericEntry('1.2.3'); assert.ok(!reason.ok && /non-negative number/.test(reason.reason));
});

