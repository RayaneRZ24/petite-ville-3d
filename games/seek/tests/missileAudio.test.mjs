import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function param(value = 0) {
  return { value, events: [], setValueAtTime(v, t) { this.value = v; this.events.push(['set', v, t]); },
    linearRampToValueAtTime(v, t) { this.value = v; this.events.push(['ramp', v, t]); },
    setTargetAtTime(v, t, c) { this.value = v; this.events.push(['target', v, t, c]); }, cancelScheduledValues() {} };
}

function scene() {
  const sources = [], buffers = [];
  const destination = {};
  const context = { currentTime: 10, destination, resumes: 0,
    createGain() { return { gain: param(), connect() {} }; },
    createDynamicsCompressor() { return { threshold: param(), ratio: param(), connect() {} }; },
    createBuffer(channels, length, rate) { const data = new Float32Array(length); const b = { channels, length, rate, getChannelData: () => data }; buffers.push(b); return b; },
    createBufferSource() { const source = { connects: [], stops: [], started: [], loop: false,
      connect(node) { this.connects.push(node); }, start(t) { this.started.push(t); }, stop(t) { this.stops.push(t); } };
      sources.push(source); return source; },
    async resume() { this.resumes++; } };
  const sandbox = vm.createContext({ WebAudiox: { getBufferFromJsfx(ctx, preset) {
    assert.equal(ctx, context); return { preset, duration: 1 };
  } } });
  vm.runInContext(readFileSync(new URL('../missileAudio.js', import.meta.url), 'utf8'), sandbox);
  const Audio = vm.runInContext('MissileAudio', sandbox);
  return { audio: new Audio({ createContext: () => context }), context, sources, buffers };
}

test('WebAudiox : quatre buffers jsfx générés au premier geste, aucun son au chargement', async () => {
  const { audio, sources, context } = scene();
  assert.equal(audio.context, null); assert.equal(sources.length, 0);
  await audio.enable();
  assert.equal(context.resumes, 1); assert.deepEqual(Object.keys(audio.buffers).sort(), ['alarm', 'decoys', 'escape', 'explosion']);
  assert.equal(sources.length, 1); // préécoute de l'alarme
  assert.deepEqual(sources[0].stops, [10.4]);
});

test('effets : alarmes 0.4 s, explosion 0.7 s et largage synthétique', async () => {
  const { audio, sources } = scene(); await audio.enable();
  audio.alarm(); audio.explosion(); audio.decoys();
  assert.deepEqual(sources.slice(1).map(source => source.stops[0]), [10.4, 10.7, 10.46]);
  assert.ok(sources.slice(1).every(source => source.buffer));
});

test('fuites : une boucle indépendante par cible, arrêt individuel et parallélisme', async () => {
  const { audio, sources, context } = scene(); await audio.enable();
  const a = {}, b = {};
  const sourceA = audio.startEscape(a), sourceB = audio.startEscape(b);
  assert.notEqual(sourceA, sourceB); assert.equal(audio.escapeSources.size, 2);
  assert.ok(sourceA.loop && sourceB.loop); assert.equal(sourceA.stops.length, 0);
  assert.equal(audio.startEscape(a), null);
  assert.equal(audio.stopEscape(a), true); assert.deepEqual(sourceA.stops, [10.085]);
  assert.equal(audio.escapeSources.has(b), true); assert.equal(audio.stopEscape(a), false);
  context.currentTime = 12; audio.stopEscape(b); assert.deepEqual(sourceB.stops, [12.085]);
});

test('volume borné et désactivation coupe toutes les sources', async () => {
  const { audio, sources } = scene(); await audio.enable();
  audio.setVolume(200); assert.equal(audio.volume, 1); assert.equal(audio.master.gain.value, 1);
  audio.setVolume(-10); assert.equal(audio.volume, 0); assert.equal(audio.master.gain.value, 0);
  audio.startEscape({}); audio.alarm(); audio.disable();
  assert.equal(audio.enabled, false); assert.equal(audio.escapeSources.size, 0); assert.equal(audio.oneShots.size, 0);
  assert.ok(sources.every(source => source.stops.length));
  assert.equal(audio.alarm(), null);
});
