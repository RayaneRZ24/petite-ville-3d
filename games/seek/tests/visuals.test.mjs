import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function canvasRecorder() {
  const calls = [];
  const context = {};
  for (const method of ['save', 'restore', 'fillRect', 'translate', 'rotate',
    'beginPath', 'moveTo', 'lineTo', 'stroke']) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  for (const method of ['createLinearGradient', 'createRadialGradient']) {
    context[method] = (...args) => {
      calls.push([method, ...args]);
      return { addColorStop: (...stop) => calls.push(['colorStop', ...stop]) };
    };
  }
  return { context, calls };
}

function background() {
  const vmContext = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../hypnoticBackground.js', import.meta.url), 'utf8'), vmContext);
  return vm.runInContext('HypnoticBackground', vmContext);
}

test('fond : anneaux arc-en-ciel continus, canvas rempli et contexte restauré', () => {
  const b = background();
  for (const [w, h] of [[800, 520], [320, 640], [1, 1]]) {
    const { context, calls } = canvasRecorder();
    b.draw(context, w, h, 3);
    assert.deepEqual(calls[0], ['save']);
    assert.deepEqual(calls.at(-1), ['restore']);
    assert.deepEqual(calls.filter(c => c[0] === 'fillRect'),
      [['fillRect', 0, 0, w, h]]);
    assert.equal(calls.filter(c => c[0] === 'stroke').length, 0);
    assert.deepEqual(calls.find(c => c[0] === 'createRadialGradient'),
      ['createRadialGradient', w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.85]);
    assert.ok(calls.flat().filter(value => typeof value === 'number').every(Number.isFinite));
    const rainbowStops = calls.filter(c => c[0] === 'colorStop');
    assert.equal(rainbowStops.length, 25);
    assert.equal(rainbowStops[0][1], 0); assert.equal(rainbowStops.at(-1)[1], 1);
    assert.ok(rainbowStops.every((c, i) => i === 0 || c[1] > rainbowStops[i - 1][1]));
    assert.equal(new Set(rainbowStops.map(c => c[2])).size, 12);
    assert.equal(rainbowStops[0][2], 'hsl(150, 91.25%, 43.5%)');
  }
});

test('fond : animation déterministe et dimensions vides ignorées', () => {
  const b = background();
  const first = canvasRecorder(); const second = canvasRecorder(); const repeat = canvasRecorder();
  b.draw(first.context, 800, 520, 0);
  b.draw(second.context, 800, 520, 10);
  b.draw(repeat.context, 800, 520, 10);
  assert.deepEqual(second.calls, repeat.calls);
  assert.notDeepEqual(first.calls.filter(c => c[0] === 'colorStop'), second.calls.filter(c => c[0] === 'colorStop'));
  for (const [w, h] of [[0, 500], [500, 0], [-1, 500]]) {
    const empty = canvasRecorder(); b.draw(empty.context, w, h, 0);
    assert.equal(empty.calls.length, 0);
  }
});

test('fond : centre suit le pointeur sans le modifier, bords et intensité bornés', () => {
  const b = background();
  const center = { x: 125, y: 100 };
  const recording = canvasRecorder();
  b.draw(recording.context, 800, 520, 0, { center, intensity: 1 });
  assert.deepEqual(center, { x: 125, y: 100 });
  assert.deepEqual(recording.calls.find(c => c[0] === 'createRadialGradient'),
    ['createRadialGradient', 125, 100, 0, 125, 100, 680]);
  assert.equal(recording.calls.find(c => c[0] === 'colorStop')[2], 'hsl(60, 100%, 50%)');
  for (const [intensity, color] of [[0, 'hsl(60, 65%, 24%)'], [-2, 'hsl(60, 65%, 24%)'], [3, 'hsl(60, 100%, 50%)']]) {
    const edge = canvasRecorder();
    b.draw(edge.context, 800, 520, 0, { center: { x: -10, y: 600 }, intensity });
    assert.deepEqual(edge.calls.find(c => c[0] === 'createRadialGradient'),
      ['createRadialGradient', 0, 520, 0, 0, 520, 680]);
    assert.equal(edge.calls.find(c => c[0] === 'colorStop')[2], color);
  }
});

test('cible : rond rouge et halo blanc permanent, sans modification de son état au dessin', () => {
  const calls = [];
  const context = vm.createContext({
    createVector: (x, y) => ({ x, y, set(x, y) { this.x = x; this.y = y; return this; } }),
    SeekPopulation: { ARRIVAL_RADIUS: 16 },
  });
  for (const name of ['push', 'pop', 'translate', 'fill', 'stroke', 'strokeWeight', 'circle', 'line', 'noFill']) {
    context[name] = (...args) => calls.push([name, ...args]);
  }
  for (const file of ['vehicle.js', 'targetAvoidance.js', 'target.js', 'mouseTarget.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  const target = vm.runInContext('new MouseTarget(80, 120)', context);
  const before = JSON.stringify(target);
  target.show();
  assert.equal(JSON.stringify(target), before);
  assert.equal(vm.runInContext('MouseTarget.prototype instanceof Vehicle', context), true);
  assert.deepEqual(calls, [
    ['push'], ['noFill'], ['stroke', '#ffffff'], ['strokeWeight', 1.5], ['circle', 80, 120, 50],
    ['fill', '#ff3030'], ['strokeWeight', 2],
    ['circle', 80, 120, 28], ['pop'],
  ]);
});
