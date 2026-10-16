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

function scene(width = 800, height = 600) {
  const context = vm.createContext({ width, height, createVector: (x, y) => new Vector(x, y),
    p5: { Vector }, setInterval: () => assert.fail('Aucun timer par entité') });
  for (const file of ['vehicle.js', 'population.js', 'fleeBehavior.js', 'follower.js',
    'targetAvoidance.js', 'targetMotion.js', 'target.js', 'arrivalRules.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return vm.runInContext('({ Vehicle, Follower, Target, flee: FleeBehavior, motion: TargetMotion, arrival: ArrivalRules })', context);
}

test('flee : inverse de seek pour l’exercice, puis inversion correcte de la vitesse désirée', () => {
  const { Follower, flee } = scene();
  const v = new Follower(0, 0), position = new Vector(10, 0);
  v.maxSpeed = 10; v.maxForce = 100; v.vel.set(2, 3);
  const before = JSON.stringify([v, position]);
  const naive = flee.invertedSeek(v, position);
  const correct = v.flee(position);
  assert.deepEqual([naive.x, naive.y], [-8, 3]);
  assert.deepEqual([correct.x, correct.y], [-12, -3]);
  assert.equal(JSON.stringify([v, position]), before);
  v.vel.set(0, 0);
  assert.deepEqual([v.flee(position).x, v.flee(position).y], [-10, 0]);
});

test('flee : directions, limites, position confondue et vitesse excessive', () => {
  const { Follower } = scene();
  for (const [x, y] of [[0.001, 0], [1000, 0], [-20, 0], [0, 20], [0, -20], [30, 40]]) {
    const v = new Follower(0, 0); v.maxForce = 0.35;
    const force = v.flee(new Vector(x, y));
    assert.ok(force.x * x + force.y * y < 0);
    assert.ok(force.mag() <= v.maxForce + 1e-12);
  }
  const v = new Follower(0, 0);
  assert.ok(Number.isFinite(v.flee(v.pos).mag()));
  v.vel.set(10, 0);
  assert.ok(v.flee(new Vector(-100, 0)).x < 0); // Ralentir même si la vitesse pointe déjà loin de la cible.
  v.maxForce = 0;
  assert.equal(v.flee(v.pos).mag(), 0);
});

test('Follower : composition seek/flee par applyForce, locomotion et bords hérités', () => {
  const { Follower, Vehicle } = scene(); const v = new Follower(10, 10);
  assert.ok(v instanceof Vehicle);
  assert.equal(v.update, Vehicle.prototype.update); assert.equal(v.edges, Vehicle.prototype.edges);
  v.applyBehaviors(new Vector(100, 10));
  assert.ok(v.acc.x > 0); assert.equal(v.pos.x, 10);
  v.acc.set(0, 0); v.behavior = 'flee';
  v.applyBehaviors(new Vector(100, 10));
  assert.ok(v.acc.x < 0); assert.equal(v.pos.x, 10);
  v.update(); assert.ok(v.pos.x < 10); assert.equal(v.acc.mag(), 0);
});

test('Target : sous-classe de Vehicle, direction initiale reproductible et locomotion héritée', () => {
  const { Target, Vehicle } = scene(); const t = new Target(100, 100, () => 0.25);
  assert.ok(t instanceof Vehicle); assert.equal(t.r, 16);
  assert.equal(t.update, Vehicle.prototype.update); assert.equal(t.edges, Vehicle.prototype.edges);
  assert.ok(Math.abs(t.vel.x) < 1e-12); assert.equal(t.vel.y, 3);
  const before = [t.pos.x, t.pos.y];
  t.applyAvoidance([]);
  assert.deepEqual([t.pos.x, t.pos.y], before);
  t.update(); assert.ok(t.pos.y > 100); assert.equal(t.acc.mag(), 0);
});

test('wander : variation continue, force désirée moins vitesse actuelle, aléatoire injecté et bornes', () => {
  const { Target, motion } = scene(); const t = new Target(0, 0, () => 0);
  t.vel.set(0, 0); t.maxForce = 100;
  const before = JSON.stringify(t);
  const result = motion.wander(t, 0, () => 0.5);
  assert.equal(result.angle, 0);
  assert.deepEqual([result.force.x, result.force.y], [0.36, 0]);
  assert.equal(JSON.stringify(t), before);
  let angle = 0;
  for (const random of [0, 1, 0.5, 0.3]) {
    const next = motion.wander(t, angle, () => random);
    assert.ok(Math.abs(next.angle - angle) <= 0.06 + 1e-12);
    assert.ok(next.force.mag() <= t.maxForce + 1e-12);
    angle = next.angle;
  }
  t.vel.set(16, 0); t.maxForce = 0.1;
  assert.ok(Math.abs(motion.wander(t, 0, () => 0.5).force.x + 0.1) < 1e-12);
  t.maxForce = 0; assert.equal(motion.wander(t, 0, () => 0.5).force.mag(), 0);
});

test('Target : priorité à la fuite protégée, wander quand la protection est désactivée', () => {
  const { Target, Follower } = scene(); const t = new Target(400, 300, () => 0);
  const follower = new Follower(440, 300);
  t.vel.set(0, 0);
  assert.ok(t.applyAvoidance([follower]).x < 0); assert.equal(t.isFleeing, true);
  t.acc.set(0, 0); t.protected = false;
  assert.ok(t.applyAvoidance([follower]).x > 0); assert.equal(t.isFleeing, false);
  assert.equal(t.previousForce.mag(), 0); assert.equal(t.threat, null);
});

test('Target : réapparition aux quatre bords sans perdre la vitesse', () => {
  const { Target } = scene();
  for (const [x, y, nextX, nextY] of [[817, 100, -16, 100], [-17, 100, 816, 100],
    [100, 617, 100, -16], [100, -17, 100, 616], [817, 617, -16, -16]]) {
    const t = new Target(x, y, () => 0); t.vel.set(2, 1); t.edges();
    assert.deepEqual([t.pos.x, t.pos.y], [nextX, nextY]);
    assert.deepEqual([t.vel.x, t.vel.y], [2, 1]);
  }
});

test('variante : même cible repositionnée hors de tous les véhicules, réglages et véhicules préservés', () => {
  const { Target, Follower, arrival } = scene(); const t = new Target(400, 300, () => 0.25);
  const vehicles = [new Follower(400, 300), new Follower(500, 400)];
  t.isFleeing = true; t.previousForce.set(3, 1); t.acc.set(1, 2);
  const before = JSON.stringify(vehicles), settings = [t.maxSpeed, t.maxForce, t.r];
  assert.equal(arrival.respawnTarget(t, vehicles, 800, 600, () => 0.1), true);
  assert.ok(t.pos.x >= 16 && t.pos.x <= 784 && t.pos.y >= 16 && t.pos.y <= 584);
  assert.ok(vehicles.every(v => Math.hypot(v.pos.x - t.pos.x, v.pos.y - t.pos.y) > 20));
  assert.equal(JSON.stringify(vehicles), before);
  assert.deepEqual([t.maxSpeed, t.maxForce, t.r], settings);
  assert.equal(t.vel.mag(), 3); assert.equal(t.acc.mag(), 0);
  assert.equal(t.previousForce.mag(), 0); assert.equal(t.isFleeing, false);
});

test('variante : tirage borné, exclusion des autres véhicules et repli sur un coin valide', () => {
  const { Target, Follower, arrival } = scene(); const t = new Target(400, 300, () => 0);
  const vehicles = [new Follower(16, 16), new Follower(400, 300)];
  let attempts = 0;
  assert.equal(arrival.respawnTarget(t, vehicles, 800, 600, () => { attempts++; return 0.5; }), true);
  assert.equal(attempts, 64);
  assert.ok(vehicles.every(v => Math.hypot(v.pos.x - t.pos.x, v.pos.y - t.pos.y) > 20));
});

test('variante : petit canvas impossible, état intact et une seule tentative par image', () => {
  const { Target, Follower, arrival } = scene(10, 10); const t = new Target(5, 5, () => 0);
  const vehicles = [new Follower(5, 5), new Follower(5, 5)];
  t.maxSpeed = 0; t.maxForce = 0; t.vel.set(0, 0); t.protected = false;
  const before = JSON.stringify([t, vehicles]);
  assert.equal(arrival.respawnTarget(t, vehicles, 10, 10, () => 0.5), false);
  assert.equal(JSON.stringify([t, vehicles]), before);
  let attempts = 0;
  assert.equal(arrival.step(vehicles, t, 10, 10, 'target', () => { attempts++; return 0.5; }), false);
  assert.equal(attempts, 64);
});

test('arrivées simultanées : une réapparition de cible, une locomotion par entité et aucun véhicule téléporté', () => {
  const { Target, Follower, arrival } = scene(); const t = new Target(400, 300, () => 0);
  t.protected = false;
  const vehicles = Array.from({ length: 3 }, () => new Follower(400, 300));
  for (const v of vehicles) v.maxForce = 0;
  let resets = 0, updates = 0;
  const reset = t.resetMotion.bind(t), update = t.update.bind(t);
  t.resetMotion = () => { resets++; reset(); };
  t.update = () => { updates++; update(); };
  assert.equal(arrival.step(vehicles, t, 800, 600, 'target', () => 0.1), true);
  assert.equal(resets, 1); assert.equal(updates, 1);
  assert.ok(vehicles.every(v => v.pos.x === 400 && v.pos.y === 300 && v.vel.mag() === 0));
});

test('variante : arrivée après locomotion ou wrap détectée sans seconde mise à jour de cible', () => {
  const { Target, Follower, arrival } = scene();
  for (const wrap of [false, true]) {
    const t = new Target(wrap ? 817 : 400, wrap ? 100 : 300, () => 0);
    t.protected = false; t.maxForce = 0; t.maxSpeed = 0; t.vel.set(0, 0);
    const v = new Follower(wrap ? 0 : 418, wrap ? 100 : 300);
    v.vel.set(wrap ? 0 : -4, 0); v.maxForce = 0;
    assert.equal(arrival.step([v], t, 800, 600, 'target', () => 0.1), true);
    assert.equal(v.pos.x, wrap ? 0 : 414); assert.equal(v.vel.x, wrap ? 0 : -4);
    assert.ok(Math.hypot(t.pos.x - v.pos.x, t.pos.y - v.pos.y) > 20);
  }
});

test('mode classique : le véhicule réapparaît, pas la cible ; mode invalide rejeté', () => {
  const { Target, Follower, arrival } = scene(); const t = new Target(400, 300, () => 0);
  const v = new Follower(400, 300); v.vel.set(2, 1); t.protected = false;
  assert.equal(arrival.step([v], t, 800, 600, 'vehicle', () => 0.1), false);
  assert.equal(v.vel.mag(), 0); assert.equal(v.acc.mag(), 0);
  assert.ok(Math.hypot(v.pos.x - t.pos.x, v.pos.y - t.pos.y) > 20);
  assert.ok(Math.hypot(t.pos.x - 400, t.pos.y - 300) <= 3 + 1e-12);
  assert.throws(() => arrival.step([v], t, 800, 600, 'unknown'), { name: 'RangeError' });
});
