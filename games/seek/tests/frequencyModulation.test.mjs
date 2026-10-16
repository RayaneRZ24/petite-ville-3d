import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const scope = vm.createContext({});
vm.runInContext(readFileSync(new URL('../frequencyModulation.js', import.meta.url), 'utf8'), scope);
const fm = vm.runInContext('FrequencyModulation', scope);
const center = () => ({ set(x, y) { this.x = x; this.y = y; } });

test('FM : coordonnées normalisées, quatre bords et centre', () => {
  for (const [x, y, rate, depth] of [[0, 0, 0.25, 80], [800, 0, 12, 80],
    [0, 600, 0.25, 0], [800, 600, 12, 0], [400, 300, 6.125, 40], [-10, 700, 0.25, 0]]) {
    const settings = fm.fromPointer({ x, y }, 800, 600);
    assert.equal(settings.rateHz, rate); assert.equal(settings.depthHz, depth);
  }
  assert.equal(fm.fromPointer({ x: 200, y: 150 }, 400, 300).rateHz, 6.125);
  for (const [w, h] of [[0, 600], [800, 0], [NaN, 600]]) {
    assert.throws(() => fm.fromPointer({ x: 0, y: 0 }, w, h), { name: 'RangeError' });
  }
});

test('FM visuelle : phase continue, vitesse proportionnelle, temps négatif ignoré', () => {
  assert.ok(Math.abs(fm.advancePhase(0, 1, 2) - Math.PI / 2) < 1e-12);
  assert.ok(Math.abs(fm.advancePhase(0, 1, 4) - Math.PI) < 1e-12);
  const whole = fm.advancePhase(0, 1, 2);
  const partial = fm.advancePhase(fm.advancePhase(0, 0.5, 2), 0.5, 2);
  assert.equal(whole, partial);
  assert.equal(fm.advancePhase(1, -1, 2), 1);
  assert.ok(fm.advancePhase(0, 1000, 12) < Math.PI * 2);
});

test('FM visuelle : mouvement lié à la profondeur, centre borné et pointeur intact', () => {
  const pointer = { x: 400, y: 300 }; const c = center();
  fm.animateCenter(c, pointer, 800, 600, Math.PI / 2, 80);
  assert.equal(c.x, 508); assert.ok(Math.abs(c.y - 300) < 1e-12);
  fm.animateCenter(c, pointer, 800, 600, Math.PI / 2, 40);
  assert.equal(c.x, 454);
  fm.animateCenter(c, pointer, 800, 600, 1, 0);
  assert.equal(c.x, 400); assert.equal(c.y, 300);
  assert.deepEqual(pointer, { x: 400, y: 300 });
  for (const [x, y] of [[0, 0], [800, 600], [0, 600], [800, 0]]) {
    for (const phase of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      fm.animateCenter(c, { x, y }, 800, 600, phase, 80);
      assert.ok(c.x >= 0 && c.x <= 800 && c.y >= 0 && c.y <= 600);
    }
  }
});
