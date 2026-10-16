import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}

function scene(w = 800, h = 600) {
  const calls = [];
  const context = vm.createContext({ width: w, height: h,
    p5: { Vector }, createVector: (x, y) => new Vector(x, y), CENTER: 'center' });
  for (const name of ['push', 'pop', 'noFill', 'fill', 'stroke', 'strokeWeight', 'circle', 'noStroke', 'rect', 'text', 'textSize', 'textAlign']) {
    context[name] = (...args) => calls.push([name, ...args]);
  }
  for (const file of ['vehicle.js', 'population.js', 'fleeBehavior.js', 'follower.js', 'targetAvoidance.js',
    'targetMotion.js', 'target.js', 'fleeingTargetBehavior.js', 'targetFutante.js', 'targetPopulation.js', 'arrivalRules.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return { calls, ...vm.runInContext('({ Vehicle, Follower, Target, TargetFuyante, population: TargetPopulation, arrival: ArrivalRules, spawn: SeekPopulation })', context) };
}

const rng = () => 0.5;
function tick(t, predators, dt) { t.acc.set(0, 0); return t.applyAvoidance(predators, dt); }
function freeze(t) { t.vel.set(0, 0); t.maxSpeed = 0; t.maxForce = 0; t.protected = false; }

test('duplication : seuil exact à trois secondes, un clone par fuite, plusieurs cadences', () => {
  for (const steps of [Array(180).fill(1 / 60), Array(90).fill(1 / 30), [1, 1, 0.999, 0.001]]) {
    const { TargetFuyante, Follower, population, Vehicle } = scene();
    const t = new TargetFuyante(400, 300, rng), v = new Follower(550, 300), targets = [t];
    for (const dt of steps.slice(0, -1)) { tick(t, [v], dt); assert.equal(population.duplicateReady(targets, rng).length, 0); }
    tick(t, [v], steps.at(-1));
    const born = population.duplicateReady(targets, rng);
    assert.equal(born.length, 1); assert.equal(targets.length, 2);
    assert.ok(born[0] instanceof TargetFuyante && born[0] instanceof Vehicle);
    assert.equal(t.state, 'recovering'); assert.equal(t.staminaSeconds, 0);
    assert.equal(population.duplicateReady(targets, rng).length, 0);
    assert.equal(born[0].state, 'recovering'); assert.equal(born[0].birthAge, 0);
  }
});

test('duplication : fuite interrompue ou capture sans clone, prochain compteur indépendant', () => {
  const { TargetFuyante, Follower, population } = scene();
  const t = new TargetFuyante(0, 0, rng), v = new Follower(150, 0);
  tick(t, [v], 2.9); tick(t, [], 0.1);
  assert.equal(t.state, 'normal'); assert.equal(t.duplicationPending, false);
  tick(t, [v], 0.2); // Seule l'énergie restante peut être dépensée, pas trois secondes de survie.
  assert.equal(population.duplicateReady([t], rng).length, 0);
  t.resetMotion(); tick(t, [v], 3); assert.equal(t.duplicationPending, true);
  t.onCaptured(); assert.equal(t.duplicationPending, false); assert.equal(t.fleeElapsed, 0);
  assert.equal(population.duplicateReady([t], rng).length, 0);
});

test('duplication : curseur pendant la fuite, héritage des réglages et plafond sans événement retardé', () => {
  const { TargetFuyante, Follower, population } = scene();
  const t = new TargetFuyante(0, 0, rng), v = new Follower(150, 0), targets = [t];
  tick(t, [v], 1); t.configure(250, 4);
  t.maxForce = 8; t.fleeSpeed = 24;
  tick(t, [v], 2.9); assert.equal(population.duplicateReady(targets, rng).length, 0);
  tick(t, [v], 0.1); population.duplicateReady(targets, rng);
  assert.equal(targets.length, 2);
  const clone = targets[1];
  assert.equal(clone.detectionRadius, 250); assert.equal(clone.maxFleeSeconds, 4);
  assert.equal(clone.maxForce, 8); assert.equal(clone.fleeSpeed, 24);
  assert.notEqual(clone.pos, t.pos); assert.notEqual(clone.vel, t.vel);
  while (targets.length < population.MAX_TARGETS) targets.push(new TargetFuyante(0, 0, rng));
  for (const entity of targets) entity.duplicationPending = true;
  assert.equal(population.duplicateReady(targets, rng).length, 0);
  targets.pop(); assert.equal(population.duplicateReady(targets, rng).length, 0);
});

test('duplication : naissance fluide, locomotion héritée, dessin sans mutation et grâce de 0.7 s', () => {
  const { TargetFuyante, Follower, Vehicle, population, arrival, calls } = scene();
  const t = new TargetFuyante(400, 300, rng); t.duplicationPending = true;
  const targets = [t]; const clone = population.duplicateReady(targets, rng)[0];
  assert.equal(clone.update, Vehicle.prototype.update);
  assert.deepEqual([clone.pos.x, clone.pos.y], [400, 300]);
  const before = JSON.stringify(clone); clone.show(false, []);
  assert.equal(JSON.stringify(clone), before);
  assert.ok(calls.some(c => c[0] === 'circle' && c[3] < 28));
  const v = new Follower(400, 300); freeze(clone); freeze(v);
  arrival.step([v], [clone], 800, 600, 'vehicle', rng, 0.3);
  assert.equal(v.xp, 0); assert.equal(clone.birthAge, 0.3);
  const savedPosition = [clone.pos.x, clone.pos.y];
  clone.animate(0.2); assert.deepEqual([clone.pos.x, clone.pos.y], savedPosition);
  arrival.step([v], [clone], 800, 600, 'vehicle', rng, 0.2);
  assert.equal(v.xp, 10); assert.equal(clone.birthAge, 0.7);
});

test('XP : +10 par capture, croissance progressive sans perte après réapparition', () => {
  const { Follower, Target, arrival } = scene();
  const t = new Target(400, 300, rng), v = new Follower(400, 300); freeze(t);
  let sounds = 0;
  arrival.step([v], t, 800, 600, 'vehicle', () => 0.1, 0.1, () => sounds++);
  assert.equal(v.xp, 10); assert.equal(v.captures, 1); assert.equal(sounds, 1);
  assert.equal(v.r, 16); assert.ok(v.desiredRadius > 16);
  assert.notEqual(v.pos.x, 400); assert.equal(v.vel.mag(), 0);
  arrival.step([v], t, 800, 600, 'vehicle', rng, 0.1, () => sounds++);
  assert.ok(v.r > 16 && v.r < v.desiredRadius); assert.equal(v.xp, 10);
  v.pos.set(t.pos.x, t.pos.y);
  arrival.step([v], t, 800, 600, 'vehicle', rng, 0.1, () => sounds++);
  assert.equal(v.xp, 20); assert.equal(v.captures, 2); assert.equal(sounds, 2);
});

test('XP : pas de récompense répétée si le canvas ne permet aucune réapparition', () => {
  const { Follower, Target, arrival } = scene(10, 10);
  for (const mode of ['vehicle', 'target']) {
    const t = new Target(5, 5, rng), v = new Follower(5, 5); freeze(t); freeze(v);
    let captures = 0;
    for (let i = 0; i < 20; i++) arrival.step([v], t, 10, 10, mode, rng, 1 / 60, () => captures++);
    assert.equal(v.xp, 10); assert.equal(captures, 1);
  }
});

test('XP : captures simultanées récompensées une fois par vaisseau et annulation du clone à la limite', () => {
  const { Follower, TargetFuyante, arrival, population } = scene();
  const t = new TargetFuyante(400, 300, rng);
  const a = new Follower(400, 300), b = new Follower(400, 300), targets = [t];
  tick(t, [a], 3); assert.equal(t.duplicationPending, true);
  let events = 0;
  arrival.step([a, b], targets, 800, 600, 'vehicle', () => 0.1, 0, () => events++);
  assert.equal(events, 2); assert.equal(a.xp, 10); assert.equal(b.xp, 10);
  assert.equal(population.duplicateReady(targets, rng).length, 0);
});

test('multi-cibles : choisir la plus proche, une locomotion par entité, capture après déplacement', () => {
  const { Follower, Target, arrival } = scene();
  const a = new Target(100, 100, rng), b = new Target(600, 300, rng), v = new Follower(620, 300);
  freeze(a); freeze(b); v.vel.set(-4, 0); v.maxForce = 0;
  assert.equal(arrival.nearestTarget(v, [a, b]), b);
  assert.equal(arrival.nearestTarget(v, []), null);
  const updates = [0, 0, 0];
  [a, b, v].forEach((entity, index) => { const update = entity.update; entity.update = function() { updates[index]++; update.call(this); }; });
  arrival.step([v], [a, b], 800, 600, 'vehicle', rng);
  assert.deepEqual(updates, [1, 1, 1]); assert.equal(v.xp, 10);
  assert.ok([a, b].every(t => Math.hypot(v.pos.x - t.pos.x, v.pos.y - t.pos.y) > v.r));
});

test('croissance : cadence indépendante, rayon utile aux contacts, steering toujours borné', () => {
  const { Follower, spawn } = scene();
  const a = new Follower(0, 0), b = new Follower(0, 0);
  for (let i = 0; i < 50; i++) { a.gainExperience(); b.gainExperience(); }
  a.animate(1); for (let i = 0; i < 60; i++) b.animate(1 / 60);
  assert.ok(Math.abs(a.r - b.r) < 1e-10);
  const radius = a.r; a.animate(-1); a.animate(NaN); assert.equal(a.r, radius);
  assert.ok(spawn.hasArrived(a, { x: a.r - 0.01, y: 0 }));
  assert.equal(spawn.hasArrived(a, { x: a.r + 0.01, y: 0 }), false);
  assert.ok(a.seek(new Vector(100, 0)).mag() <= a.maxForce + 1e-12);
  assert.ok(a.flee(new Vector(100, 0)).mag() <= a.maxForce + 1e-12);
});
