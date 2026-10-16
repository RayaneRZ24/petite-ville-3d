import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function scene() {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../captureAudio.js', import.meta.url), 'utf8'), context);
  const Audio = vm.runInContext('CaptureAudio', context);
  const audio = { paused: true, ended: false, currentTime: 0, plays: 0,
    play() { this.plays++; this.paused = false; return Promise.resolve(); },
    pause() { this.paused = true; } };
  const sound = new Audio(audio);
  return { sound, audio };
}

test('Monster Kill : fichier local fourni, pas de lecture au chargement ni avant activation', () => {
  const { sound, audio } = scene();
  assert.equal(audio.plays, 0); assert.equal(sound.capture(), false);
  const sample = readFileSync(new URL('../assets/monster-kill.m4a', import.meta.url));
  assert.ok(sample.length > 1000); assert.equal(sample.subarray(4, 8).toString(), 'ftyp');
});

test('Monster Kill : activation, capture depuis le début et captures rapprochées sans cacophonie', async () => {
  const { sound, audio } = scene();
  assert.equal(await sound.enable(), true); assert.equal(audio.plays, 1);
  assert.equal(sound.capture(), false); assert.equal(audio.plays, 1);
  audio.ended = true; audio.paused = true; audio.currentTime = 5;
  assert.equal(sound.capture(), true); assert.equal(audio.currentTime, 0); assert.equal(audio.plays, 2);
  sound.disable(); assert.equal(audio.paused, true); assert.equal(sound.capture(), false);
});

test('Monster Kill : volume indépendant, échec récupérable et arrêt pendant activation', async () => {
  const { sound, audio } = scene();
  sound.setVolume(200); assert.equal(audio.volume, 1);
  sound.setVolume(-50); assert.equal(audio.volume, 0);
  sound.setVolume(35); assert.equal(audio.volume, 0.35);
  audio.play = () => Promise.reject(new Error('autoplay'));
  assert.equal(await sound.enable(), false); assert.equal(sound.ready, false);
  let resolve;
  audio.play = () => new Promise(r => { resolve = r; });
  const pending = sound.enable(); sound.disable(); resolve();
  assert.equal(await pending, false); assert.equal(sound.enabled, false);
  audio.play = () => Promise.resolve(); assert.equal(await sound.enable(), true);
});
