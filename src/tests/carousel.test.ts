import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { CarouselNavigation } from '../src/carousel.js';

test('carousel axes stay bounded and horizontal browsing retains the section', () => {
  const navigation = new CarouselNavigation();
  navigation.move(-1, -1);
  assert.deepEqual([navigation.variant, navigation.section], [0, 0]);
  navigation.move(0, 1); navigation.move(1, 0);
  assert.deepEqual([navigation.variant, navigation.section], [1, 1]);
  navigation.move(10, 10);
  assert.deepEqual([navigation.variant, navigation.section], [2, 2]);
});
