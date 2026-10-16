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
  heading() { return Math.atan2(this.y, this.x); }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}

function scene(width = 1000, height = 700) {
  const calls = [];
  const context = vm.createContext({ width, height, p5: { Vector },
    createVector: (x, y) => new Vector(x, y), Math: Object.assign(Object.create(Math), { random: () => 0.5 }) });
  for (const name of ['push', 'pop', 'translate', 'rotate', 'stroke', 'strokeWeight', 'fill', 'triangle',
    'circle', 'noStroke', 'noFill', 'line']) context[name] = (...args) => calls.push([name, ...args]);
  for (const file of ['vehicle.js', 'fleeBehavior.js', 'targetMotion.js', 'missile.js', 'missileTarget.js',
    'decoy.js', 'explosion.js', 'missileScenario.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return { calls, ...vm.runInContext('({ Vehicle, Missile, MissileTarget, Decoy, Explosion, MissileScenario })', context) };
}

const rng = () => 0.5;

test('entités : missile, cible, leurre et explosion héritent toutes de Vehicle', () => {
  const { Vehicle, Missile, MissileTarget, Decoy, Explosion } = scene();
  const entities = [new Missile(0, 0), new MissileTarget(0, 0, rng),
    new Decoy(0, 0, new Vector(2, 0)), new Explosion(0, 0)];
  assert.ok(entities.every(entity => entity instanceof Vehicle));
  assert.ok(entities.every(entity => entity.update === Vehicle.prototype.update
    || entity.constructor === Decoy || entity.constructor === Explosion));
});

test('cible : seuil inclusif, force de fuite bornée, accélération puis ralentissement progressif', () => {
  const { Missile, MissileTarget } = scene();
  const missile = new Missile(230.001, 0), target = new MissileTarget(0, 0, rng);
  target.vel.set(0, 0);
  let result = target.decide(missile, 0.1, 0.1);
  assert.equal(target.state, 'cruising'); assert.equal(result.entered, false);
  missile.pos.x = 230;
  result = target.decide(missile, 0.1, 0.2);
  assert.equal(target.state, 'escaping'); assert.equal(result.entered, true);
  assert.ok(result.force.x < 0); assert.ok(result.force.mag() <= target.maxForce + 1e-12);
  const firstLimit = target.maxSpeed;
  target.acc.set(0, 0); target.decide(missile, 0.5, 0.7);
  assert.ok(target.maxSpeed > firstLimit); target.update();
  const fast = target.vel.mag(); assert.ok(fast > 0);
  // Tester le ralentissement depuis une vraie vitesse de fuite, supérieure à la croisière.
  target.vel.set(-target.escapeSpeed,0);
  missile.pos.x = target.pos.x + 340;
  target.acc.set(0, 0); target.decide(missile, 1 / 60, 0.8);
  assert.equal(target.state, 'cruising');
  const before = target.vel.mag(); target.update();
  assert.ok(target.vel.mag() < before); assert.ok(target.vel.mag() > target.cruiseSpeed || before <= target.cruiseSpeed);
  assert.equal(target.maxSpeed, target.escapeSpeed);
});

test('alarme : durée logique d’entrée et cooldown strict d’une seconde', () => {
  const { Missile, MissileTarget } = scene();
  const missile = new Missile(100, 0), target = new MissileTarget(0, 0, rng);
  assert.equal(target.decide(missile, 0, 0).alarm, true);
  assert.equal(target.decide(missile, 0, 0.2).alarm, false);
  missile.pos.x = 400; target.decide(missile, 0, 0.3);
  missile.pos.x = 100; assert.equal(target.decide(missile, 0, 0.9).alarm, false);
  missile.pos.x = 400; target.decide(missile, 0, 1);
  missile.pos.x = 100; assert.equal(target.decide(missile, 0, 1).alarm, true);
});

test('leurres : lots de dix, stock jamais négatif, capacité réglable en conservant les consommés', () => {
  const { Missile, MissileTarget } = scene();
  const missile = new Missile(100, 0), target = new MissileTarget(0, 0, rng, 25);
  assert.equal(target.decide(missile, 0, 0).releaseCount, 10);
  missile.pos.x = 400; target.decide(missile, 0, 2); missile.pos.x = 100;
  assert.equal(target.decide(missile, 0, 2).releaseCount, 10);
  missile.pos.x = 400; target.decide(missile, 0, 4); missile.pos.x = 100;
  assert.equal(target.decide(missile, 0, 4).releaseCount, 5);
  assert.equal(target.decoysRemaining, 0);
  target.configureCapacity(100); assert.equal(target.decoysRemaining, 75);
  target.configureCapacity(20); assert.equal(target.decoysRemaining, 0);
  for (const invalid of [-1, 301, 1.5, NaN]) assert.throws(() => target.configureCapacity(invalid), {name:'RangeError'});
});

test('leurre : durée de vie réelle réglable, locomotion héritée et wrap', () => {
  const { Decoy, Vehicle } = scene(100, 100);
  const decoy = new Decoy(95, 50, new Vector(10, 0), 2);
  assert.equal(Object.getPrototypeOf(Decoy.prototype), Vehicle.prototype);
  assert.equal(decoy.advance(1.999), false); assert.equal(decoy.ageSeconds, 1.999);
  assert.equal(decoy.pos.x, 105); // La marge inclut le rayon : wrap seulement au-delà de 107.
  assert.equal(decoy.advance(0.001), true); assert.equal(decoy.ageSeconds, 2); assert.equal(decoy.pos.x,-7);
  const age = decoy.ageSeconds; decoy.advance(-1); decoy.advance(NaN); assert.equal(decoy.ageSeconds, age);
});

test('missile : pursue anticipe sans déplacer et limite la force', () => {
  const { Missile, MissileTarget } = scene();
  const missile = new Missile(0, 0), target = new MissileTarget(100, 0, rng);
  target.vel.set(0, 4); missile.vel.set(2, 0);
  const before = [missile.pos.x, missile.pos.y];
  const force = missile.pursue(target);
  assert.deepEqual([missile.pos.x, missile.pos.y], before);
  assert.ok(force.x > 0 && force.y > 0); assert.ok(force.mag() <= missile.maxForce + 1e-12);
  missile.applyGuidance(target); assert.equal(missile.lockedSignal, target); assert.ok(missile.acc.mag() > 0);
});

test('contrôleur : quatre cibles, largage de dix, verrouillage d’un leurre et sons parallèles', () => {
  const events = { alarm: 0, decoys: 0, starts: new Set(), stops: new Set(), explosion: 0 };
  const sound = { alarm: () => events.alarm++, decoys: () => events.decoys++,
    startEscape: target => events.starts.add(target), stopEscape: target => events.stops.add(target),
    explosion: () => events.explosion++ };
  const { MissileScenario } = scene();
  const game = new MissileScenario(1000, 700, { rng, sound });
  assert.equal(game.targets.length, 4); assert.ok(game.targets.every(t => t.decoysRemaining === 100));
  game.targets[0].pos.set(game.missile.pos.x + 100, game.missile.pos.y);
  game.targets[1].pos.set(game.missile.pos.x - 100, game.missile.pos.y);
  game.targets[2].pos.set(900, 50); game.targets[3].pos.set(900, 650);
  game.step(0, 1000, 700);
  assert.equal(game.decoys.length, 20); assert.equal(events.alarm, 2); assert.equal(events.decoys, 2);
  assert.equal(events.starts.size, 2); assert.ok(game.decoys.includes(game.missile.lockedSignal));
  assert.equal(game.targets[0].decoysRemaining, 90); assert.equal(game.targets[1].decoysRemaining, 90);
});

test('contrôleur : curseurs appliqués, expiration, collision et explosion de 0.7 s', () => {
  const events = { explosions: 0 };
  const { MissileScenario } = scene();
  const game = new MissileScenario(1000, 700, { rng, sound: { explosion: () => events.explosions++, decoys(){}, alarm(){}, startEscape(){}, stopEscape(){} }, targetCount: 1 });
  game.configure(120, 3.5);
  assert.equal(game.targets[0].decoyCapacity, 120); assert.equal(game.decoyLifetime, 3.5);
  const created = game.launchDecoys(game.targets[0], 1);
  assert.equal(created[0].lifetimeSeconds, 3.5);
  game.missile.pos.set(created[0].pos.x, created[0].pos.y); game.missile.vel.set(0, 0);
  game.targets[0].pos.set(900, 650);
  game.step(0, 1000, 700);
  assert.equal(game.decoys.length, 0); assert.equal(game.explosions.length, 1); assert.equal(events.explosions, 1);
  game.step(0.699, 1000, 700); assert.equal(game.explosions.length, 1);
  game.step(0.001, 1000, 700); assert.equal(game.explosions.length, 0);
  for (const args of [[100, .1], [100, 11], [100, NaN]]) assert.throws(() => game.configure(...args), {name:'RangeError'});
});

test('contrôleur : vraie cible détruite, stock conservé, score et arrêt du son de fuite', () => {
  let explosions = 0, stopped = 0;
  const { MissileScenario } = scene();
  const game = new MissileScenario(1000, 700, { rng, targetCount: 1,
    sound: { explosion: () => explosions++, stopEscape: () => stopped++ } });
  const target = game.targets[0]; target.decoysRemaining = 42; target.state = 'escaping';
  target.pos.set(game.missile.pos.x, game.missile.pos.y); game.missile.vel.set(0, 0);
  // Aucun leurre disponible sur cette entrée déjà active.
  game.step(0, 1000, 700);
  assert.equal(game.score, 1); assert.equal(explosions, 1); assert.equal(stopped, 1);
  assert.equal(target.decoysRemaining, 42); assert.equal(target.state, 'cruising');
  assert.deepEqual([target.pos.x, target.pos.y], [500, 350]);
});

test('rendu debug : cercle de détection sans mutation de la simulation', () => {
  const { MissileScenario, calls } = scene();
  const game = new MissileScenario(1000, 700, { rng, targetCount: 1 });
  const before = JSON.stringify(game);
  game.show(true);
  assert.equal(JSON.stringify(game), before);
  assert.ok(calls.some(call => call[0] === 'circle' && call[3] === 460));
});
