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

function scene() {
  const calls = [];
  const context = vm.createContext({ width: 800, height: 600,
    p5: { Vector }, createVector: (x, y) => new Vector(x, y),
    setInterval: () => assert.fail('Pas de timer par entité'),
    setTimeout: () => assert.fail('Pas de timer par entité'),
  });
  for (const method of ['push', 'pop', 'noFill', 'fill', 'stroke', 'strokeWeight', 'circle', 'noStroke', 'rect']) {
    context[method] = (...args) => calls.push([method, ...args]);
  }
  for (const file of ['vehicle.js', 'population.js', 'fleeBehavior.js', 'follower.js', 'targetAvoidance.js',
    'targetMotion.js', 'target.js', 'fleeingTargetBehavior.js', 'targetFutante.js', 'scenarios.js', 'arrivalRules.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return { calls, ...vm.runInContext('({ Vehicle, Target, TargetFuyante, Follower, perception: FleeingTargetBehavior, scenarios: SeekScenarios, arrival: ArrivalRules })', context) };
}

function tick(target, vehicles, elapsed) {
  // Temps injecté, positions fixes pour isoler les règles de décision.
  target.acc.set(0, 0);
  return target.applyAvoidance(vehicles, elapsed);
}

test('héritage : flee de Target appelée, locomotion de Vehicle et forces limitées', () => {
  const { TargetFuyante, Target, Vehicle, Follower } = scene();
  const target = new TargetFuyante(0, 0, () => 0.5), predator = new Follower(150, 0);
  assert.ok(target instanceof Target && target instanceof Vehicle);
  assert.equal(Object.hasOwn(TargetFuyante.prototype, 'flee'), false);
  assert.equal(target.flee, Target.prototype.flee);
  assert.equal(target.update, Vehicle.prototype.update); assert.equal(target.edges, Vehicle.prototype.edges);
  let inheritedCalls = 0;
  const inherited = Target.prototype.flee;
  Target.prototype.flee = function(position) { inheritedCalls++; return inherited.call(this, position); };
  const before = [target.pos.x, target.pos.y];
  const force = tick(target, [predator], 0.1);
  assert.equal(inheritedCalls, 1); assert.ok(force.x < 0);
  assert.ok(force.mag() <= target.maxForce + 1e-12);
  assert.deepEqual([target.pos.x, target.pos.y], before);
  target.update(); assert.ok(target.pos.x < 0); assert.equal(target.acc.mag(), 0);
});

test('perception : plus proche, égalité stable, soi-même exclu et voisinage limité', () => {
  const { TargetFuyante, Follower, perception } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5);
  const far = new Follower(301, 0), edge = new Follower(300, 0);
  const a = new Follower(100, 0), b = new Follower(-100, 0);
  const before = JSON.stringify([t, far, edge, a, b]);
  assert.equal(perception.nearest(t, [t, far]).vehicle, null);
  assert.equal(perception.nearest(t, [edge]).vehicle, edge);
  assert.equal(perception.nearest(t, [edge, a, b]).vehicle, a);
  assert.equal(perception.nearest(t, [b, a]).vehicle, b);
  assert.equal(JSON.stringify([t, far, edge, a, b]), before);
});

test('seuils : entrée inclusive à 200 px, maintien jusqu’à 300 px puis retour au mouvement normal', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(200.001, 0);
  tick(t, [v], 0.01); assert.equal(t.state, 'normal'); assert.equal(t.threatInside, false);
  v.pos.x = 200; tick(t, [v], 0.01);
  assert.equal(t.state, 'fleeing'); assert.equal(t.threatInside, true);
  v.pos.x = 299.999; tick(t, [v], 0.01);
  assert.equal(t.isFleeing, true); assert.equal(t.threatInside, false);
  v.pos.x = 300; tick(t, [v], 0.01);
  assert.equal(t.state, 'normal'); assert.equal(t.isFleeing, false);
  assert.equal(t.threat, null); assert.equal(t.previousForce.mag(), 0);
  v.pos.x = 250; tick(t, [v], 0.01); assert.equal(t.state, 'normal');
});

test('prédateur : changement et suppression sans réinitialisation de l’endurance', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5);
  const a = new Follower(100, 0), b = new Follower(-150, 0);
  tick(t, [a, b], 0.5); assert.equal(t.threat, a);
  b.pos.x = -50; tick(t, [a, b], 0.5);
  assert.equal(t.threat, b); assert.equal(t.staminaSeconds, 2);
  tick(t, [a], 0.5); assert.equal(t.threat, a); assert.equal(t.staminaSeconds, 1.5);
  tick(t, [], 0.1); assert.equal(t.state, 'normal'); assert.equal(t.threat, null);
});

test('temps réel : épuisement exact à 3 s, indépendant du nombre d’images', () => {
  const { TargetFuyante, Follower } = scene();
  for (const deltas of [Array(30).fill(0.1), Array(180).fill(1 / 60), [0.2, 0.8, 1, 0.99, 0.01]]) {
    const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(100, 0);
    for (const dt of deltas.slice(0, -1)) tick(t, [v], dt);
    assert.equal(t.isFleeing, true);
    tick(t, [v], deltas.at(-1));
    assert.equal(t.isFleeing, false); assert.equal(t.state, 'recovering');
    assert.equal(t.staminaSeconds, 0);
  }
});

test('récupération : pas de redémarrage immédiat, recharge complète nécessaire après épuisement', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(100, 0);
  tick(t, [v], 3);
  tick(t, [v], 1);
  assert.equal(t.state, 'recovering'); assert.equal(t.isFleeing, false); assert.equal(t.staminaSeconds, 1);
  tick(t, [v], 2);
  assert.equal(t.state, 'normal'); assert.equal(t.staminaSeconds, 3); assert.equal(t.isFleeing, false);
  tick(t, [v], 0.1);
  assert.equal(t.isFleeing, true); assert.ok(Math.abs(t.staminaSeconds - 2.9) < 1e-12);
});

test('sliders : rayon effectif, durée changée pendant la fuite sans effacer le temps consommé', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(210, 0);
  tick(t, [v], 0.1); assert.equal(t.isFleeing, false);
  t.configure(220, 2.5); tick(t, [v], 1);
  t.configure(100, 1.5);
  assert.equal(t.staminaSeconds, 0.5);
  tick(t, [v], 0.5); assert.equal(t.state, 'recovering');
  t.configure(290, 4); assert.equal(t.staminaSeconds, 2.5); assert.equal(t.state, 'recovering');
  for (const args of [[0, 2], [300, 2], [NaN, 2], [200, 0], [200, 11]]) {
    assert.throws(() => t.configure(...args), { name: 'RangeError' });
  }
});

test('accélération : montée progressive de vitesse et retour doux vers le wander de Target', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(200, 0);
  const speeds = [];
  for (let i = 0; i < 24; i++) {
    v.pos.set(t.pos.x + 150, t.pos.y);
    const force = tick(t, [v], 1 / 60);
    assert.ok(force.mag() <= t.maxForce + 1e-12);
    t.update(); speeds.push(t.vel.mag());
    assert.ok(t.vel.mag() <= t.fleeSpeed + 1e-12);
  }
  assert.ok(speeds[0] < speeds.at(-1)); assert.ok(speeds.at(-1) > t.cruiseSpeed);
  const before = t.vel.mag();
  tick(t, [], 1 / 60); t.update();
  assert.ok(t.vel.mag() < before); assert.ok(t.vel.mag() > t.cruiseSpeed);
  assert.equal(t.maxSpeed, t.fleeSpeed);
});

test('cas limites : temps nul/invalide, grande pause et positions confondues', () => {
  const { TargetFuyante, Follower } = scene();
  const t = new TargetFuyante(0, 0, () => 0.5), v = new Follower(0, 0);
  for (const dt of [0, -1, NaN, Infinity]) {
    assert.ok(Number.isFinite(tick(t, [v], dt).mag()));
    assert.equal(t.staminaSeconds, 3);
  }
  tick(t, [v], 20); assert.equal(t.state, 'recovering'); assert.equal(t.staminaSeconds, 0);
  tick(t, [], 20); assert.equal(t.staminaSeconds, 3);
});

test('rendu : cercle visible hors debug, jaune libre/rouge occupé, barre proportionnelle et état intact', () => {
  const { TargetFuyante, Follower, calls } = scene();
  const t = new TargetFuyante(400, 300, () => 0.5);
  t.show(false);
  assert.equal(calls.filter(c => c[0] === 'circle').length, 3);
  assert.equal(calls.filter(c => c[0] === 'rect').length, 2);
  assert.ok(calls.some(c => c[0] === 'rect' && c[3] === 48));
  calls.length = 0;
  tick(t, [], 0); const before = JSON.stringify(t); t.show(true);
  assert.equal(JSON.stringify(t), before);
  assert.ok(calls.some(c => c[0] === 'circle' && c[3] === 400));
  assert.ok(calls.some(c => c[0] === 'stroke' && c[1] === '#ffd84d'));
  calls.length = 0;
  tick(t, [new Follower(500, 300)], 1.5); t.show(true);
  assert.ok(calls.some(c => c[0] === 'stroke' && c[1] === '#ff4040'));
  assert.ok(calls.some(c => c[0] === 'rect' && c[3] === 24));
  calls.length = 0;
  const stateBeforeRendering = JSON.stringify(t);
  t.show(true, [new Follower(700, 300)]);
  assert.ok(calls.some(c => c[0] === 'stroke' && c[1] === '#ffd84d'));
  assert.equal(JSON.stringify(t), stateBeforeRendering);
});

test('scénarios : poursuite normale, cible fuyante, variantes et réinitialisation sans timer', () => {
  const { scenarios, Target, TargetFuyante } = scene();
  const normal = scenarios.createTarget('pursuit', 400, 300, () => 0.5);
  assert.ok(normal instanceof Target && !(normal instanceof TargetFuyante));
  assert.equal(normal.protected, false);
  const fleeing = scenarios.createTarget('endurance', 400, 300, () => 0.5);
  assert.ok(fleeing instanceof TargetFuyante);
  fleeing.staminaSeconds = 0; fleeing.state = 'recovering'; fleeing.resetMotion();
  assert.equal(fleeing.staminaSeconds, 3); assert.equal(fleeing.state, 'normal');
  assert.equal(scenarios.get('targetRespawn').arrival, 'target');
  assert.equal(scenarios.get('flee').behavior, 'flee');
  assert.throws(() => scenarios.get('invalid'), { name: 'RangeError' });
});
