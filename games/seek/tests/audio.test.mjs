import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../hypnoticAudio.js', import.meta.url), 'utf8');
const fmCode = readFileSync(new URL('../frequencyModulation.js', import.meta.url), 'utf8');
const scope = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(fmCode, scope);
vm.runInContext(code, scope);
const { HypnoticAudio, bindHypnoticAudio } = vm.runInContext('({ HypnoticAudio, bindHypnoticAudio })', scope);

class Param {
  value = 0;
  events = [];
  cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  setValueAtTime(value, time) { this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); }
  setTargetAtTime(value, time, constant) { this.events.push(['target', value, time, constant]); }
}

function harness() {
  const timers = new Map();
  const nodes = [];
  let creations = 0;
  const context = {
    currentTime: 5, state: 'suspended', destination: {},
    async resume() { this.state = 'running'; },
    async suspend() { this.state = 'suspended'; },
    async close() { this.state = 'closed'; },
  };
  function node(kind) {
    const n = { kind, connections: [], starts: 0, stops: 0, disconnected: false,
      gain: new Param(), frequency: new Param(), detune: new Param(),
      Q: new Param(), delayTime: new Param(),
      connect(other) { this.connections.push(other); },
      disconnect() { this.disconnected = true; },
      start() { this.starts++; }, stop() { this.stops++; },
    };
    nodes.push(n); return n;
  }
  context.createGain = () => node('gain');
  context.createBiquadFilter = () => node('filter');
  context.createDelay = () => node('delay');
  context.createOscillator = () => node('oscillator');
  const music = new HypnoticAudio({
    createContext() { creations++; return context; },
    setTimer(callback, delay) { const id = {}; timers.set(id, { callback, delay }); return id; },
    clearTimer(id) { timers.delete(id); },
  });
  return { music, context, timers, nodes, get creations() { return creations; } };
}

test('audio : aucun son au chargement, accord et modulation lente au premier démarrage', async () => {
  const h = harness();
  assert.equal(h.creations, 0); assert.equal(h.music.playing, false);
  h.music.setVolume(0.5); assert.equal(h.creations, 0);
  await h.music.start();
  assert.equal(h.creations, 1); assert.equal(h.context.state, 'running');
  assert.equal(h.music.playing, true);
  const oscillators = h.nodes.filter(n => n.kind === 'oscillator');
  assert.equal(oscillators.length, 11);
  assert.deepEqual(Array.from(h.music.carriers, n => n.frequency.value),
    [220, 329.62, 440, 554.36, 659.26]);
  assert.ok(oscillators.every(n => n.starts === 1));
  assert.deepEqual(Array.from(h.music.carriers, n => n.type), ['sine', 'sine', 'triangle', 'triangle', 'triangle']);
  assert.ok(oscillators.filter(n => !h.music.carriers.includes(n)).every(n => n.type === 'sine'));
  assert.ok(oscillators.filter(n => n.frequency.value < 1).every(n => n.frequency.value >= 0.07 && n.frequency.value <= 0.18));
  assert.deepEqual(h.music.master.gain.events.at(-1), ['ramp', 0.5, 5.3]);
  const delay = h.nodes.find(n => n.kind === 'delay');
  assert.equal(delay.delayTime.value, 0.65);
  assert.ok(delay.connections.includes(h.music.master));
  assert.equal(h.music.filter.type, 'lowpass');
  assert.equal(h.music.filter.frequency.value, 2800);
  assert.ok(h.music.carriers.every(n => n.frequency.value - 80 >= 140));
  assert.equal(h.music.fmModulator.frequency.value, 6.125);
  assert.equal(h.music.fmDepth.gain.value, 40);
  assert.ok(h.music.fmModulator.connections.includes(h.music.fmDepth));
  assert.ok(h.music.carriers.every(carrier => h.music.fmDepth.connections.includes(carrier.frequency)));
});

test('audio : volume borné, transitions progressives et volume nul', async () => {
  const h = harness(); await h.music.start();
  for (const [input, expected] of [[0, 0], [0.75, 0.75], [1, 1], [-2, 0], [3, 1]]) {
    h.music.setVolume(input);
    assert.equal(h.music.volume, expected);
    assert.deepEqual(h.music.master.gain.events.slice(-3),
      [['cancel', 5], ['set', 0, 5], ['ramp', expected, 5.3]]);
  }
  for (const invalid of [NaN, Infinity, '30']) {
    assert.throws(() => h.music.setVolume(invalid), { name: 'RangeError' });
  }
});

test('audio : arrêt en fondu puis suspension, reprise sans nouvelles sources', async () => {
  const h = harness();
  h.music.stop(); assert.equal(h.creations, 0);
  await h.music.start(); const count = h.nodes.length;
  h.music.stop(); assert.equal(h.music.playing, false);
  assert.deepEqual(h.music.master.gain.events.at(-1), ['ramp', 0, 5.3]);
  const timer = [...h.timers.values()][0];
  assert.equal(timer.delay, 350);
  timer.callback(); await Promise.resolve();
  assert.equal(h.context.state, 'suspended');
  await h.music.start();
  assert.equal(h.context.state, 'running'); assert.equal(h.creations, 1);
  assert.equal(h.nodes.length, count);
  assert.ok(h.music.sources.every(source => source.starts === 1));
});

test('audio : reprise rapide annule la suspension et fermeture libère les sources', async () => {
  const h = harness(); await h.music.start();
  h.music.stop(); assert.equal(h.timers.size, 1);
  await h.music.start(); assert.equal(h.timers.size, 0);
  await h.music.dispose();
  assert.equal(h.context.state, 'closed'); assert.equal(h.music.playing, false);
  assert.equal(h.timers.size, 0);
  assert.ok(h.music.sources.every(source => source.stops === 1));
  assert.ok(h.nodes.every(node => node.disconnected));
  await assert.rejects(h.music.start(), /Audio fermé/);
  await h.music.dispose();
  assert.ok(h.music.sources.every(source => source.stops === 1));
});

function controls() {
  const h = harness();
  const nodes = new Map();
  const document = { getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: id === 'music-volume' ? '35' : '', events: {}, attrs: {}, disabled: false,
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
    });
    return nodes.get(id);
  } };
  bindHypnoticAudio(document, h.music);
  return { h, button: nodes.get('music-toggle'), slider: nodes.get('music-volume'),
    output: nodes.get('music-volume-value'), status: nodes.get('music-status') };
}

test('audio : les timers du navigateur sont appelés sans utiliser le synthétiseur comme récepteur', async () => {
  const h = harness();
  let scheduled = 0; let cancelled = 0;
  const browserScope = vm.createContext({
    setTimeout() { assert.notEqual(this?.constructor?.name, 'HypnoticAudio'); scheduled++; return 1; },
    clearTimeout() { assert.notEqual(this?.constructor?.name, 'HypnoticAudio'); cancelled++; },
  });
  vm.runInContext(fmCode, browserScope);
  vm.runInContext(code, browserScope);
  const Audio = vm.runInContext('HypnoticAudio', browserScope);
  const music = new Audio({ createContext: () => h.context });
  await music.start(); music.stop(); await music.start();
  assert.equal(scheduled, 1); assert.equal(cancelled, 1);
  await music.dispose();
});

test('FM : paramètres de la souris conservés avant le clic et initialisation du graphe', async () => {
  const h = harness();
  h.music.setModulation(10, 75);
  assert.equal(h.creations, 0);
  await h.music.start();
  assert.equal(h.music.fmModulator.frequency.value, 10);
  assert.equal(h.music.fmDepth.gain.value, 75);
  assert.equal(h.music.volume, 0.35);
});

test('FM : changements lissés, paramètres bornés et aucune nouvelle source', async () => {
  const h = harness(); await h.music.start();
  const count = h.nodes.length;
  for (const [rate, depth, expectedRate, expectedDepth] of [[0.25, 0, 0.25, 0], [12, 80, 12, 80], [-1, -2, 0.25, 0], [100, 200, 12, 80]]) {
    h.music.setModulation(rate, depth);
    assert.deepEqual(h.music.fmModulator.frequency.events.slice(-2),
      [['cancel', 5], ['target', expectedRate, 5, 0.08]]);
    assert.deepEqual(h.music.fmDepth.gain.events.slice(-2),
      [['cancel', 5], ['target', expectedDepth, 5, 0.08]]);
  }
  assert.equal(h.nodes.length, count);
  assert.equal(h.music.volume, 0.35);
  for (const values of [[NaN, 1], [1, Infinity]]) {
    assert.throws(() => h.music.setModulation(...values), { name: 'RangeError' });
  }
  h.music.stop(); h.music.setModulation(3, 25); await h.music.start();
  assert.equal(h.music.fm.rateHz, 3); assert.equal(h.music.fm.depthHz, 25);
  assert.equal(h.creations, 1);
});

test('contrôles audio : clic pour démarrer/couper, volume et libellés accessibles', async () => {
  const c = controls(); assert.equal(c.h.creations, 0);
  assert.equal(c.output.value, '35 %');
  await c.button.events.click();
  assert.equal(c.button.textContent, 'Couper la musique');
  assert.equal(c.button.attrs['aria-pressed'], 'true');
  assert.equal(c.button.disabled, false);
  c.slider.value = '0'; c.slider.events.input();
  assert.equal(c.h.music.volume, 0); assert.equal(c.output.value, '0 %');
  await c.button.events.click();
  assert.equal(c.button.textContent, 'Activer la musique');
  assert.equal(c.button.attrs['aria-pressed'], 'false');
  assert.equal(c.h.music.playing, false);
});

test('contrôles audio : échec récupérable et double clic ignoré pendant la reprise', async () => {
  const c = controls();
  c.h.context.resume = async () => { throw new Error('Resume refused'); };
  await c.button.events.click();
  assert.equal(c.button.disabled, false);
  assert.equal(c.button.attrs['aria-pressed'], 'false');
  assert.match(c.status.textContent, /réessayer/);
  let finish;
  c.h.context.resume = () => new Promise(resolve => { finish = resolve; });
  const pending = c.button.events.click();
  assert.equal(c.button.disabled, true);
  await c.button.events.click(); assert.equal(c.h.creations, 1);
  finish(); await pending;
  assert.equal(c.h.music.playing, true); assert.equal(c.button.disabled, false);
});
