import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { DecisionPulse } from '../src/decision-pulse.js';

test('selection feedback has a two-second period and stops after two cycles', () => {
  const pulse = new DecisionPulse();
  assert.equal(pulse.active, false);
  pulse.trigger(false); assert.equal(pulse.advance(0), 1);
  assert.equal(pulse.advance(1), 0.7);
  assert.equal(pulse.advance(1), 1);
  assert.equal(pulse.advance(1), 0.7);
  assert.equal(pulse.advance(1), 1);
  assert.equal(pulse.active, false);
});

test('reduced motion and cancellation leave the nexus steady; a new selection restarts', () => {
  const pulse = new DecisionPulse();
  pulse.trigger(true); assert.equal(pulse.active, false); assert.equal(pulse.advance(1), 1);
  pulse.trigger(false); pulse.advance(0.5); pulse.trigger(false);
  assert.equal(pulse.advance(-1), 1);
  pulse.cancel(); assert.equal(pulse.advance(0), 1);
});
