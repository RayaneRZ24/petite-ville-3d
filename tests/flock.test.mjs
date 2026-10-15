import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function scene() {
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const context = vm.createContext({ console, rng }); vm.runInContext('Math.random = rng;', context);
  for (const file of ['libraries/3d/yuka.js', '3d/circuit3d.js', '3d/weightedSteering3d.js', '3d/boidRules3d.js',
    '3d/altitudeHold3d.js', '3d/flockDrone3d.js', '3d/trafficContacts3d.js','3d/world3d.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return { context, ...vm.runInContext('({YUKA, World3D, BoidRules3D, AltitudeHold3D, FlockDrone3D, WeightedSteering3D})', context) };
}

function agent(YUKA, x = 0, z = 0, vx = 0, vz = 0, id = 0) {
  const a = new YUKA.Vehicle(); a.position.set(x, 0, z); a.velocity.set(vx, 0, vz);
  Object.assign(a, { perceptionRadius: 4, maxSpeed: 5, maxForce: 10, agentId: id }); return a;
}

test('boids : calculs identiques aux trois méthodes originales de 7-Boids', () => {
  const { YUKA, BoidRules3D } = scene();
  class Vec {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    div(n) { this.x /= n; this.y /= n; return this; }
    setMag(n) { const length = Math.hypot(this.x, this.y); if (length) { this.x *= n / length; this.y *= n / length; } return this; }
    limit(n) { if (Math.hypot(this.x, this.y) > n) this.setMag(n); return this; }
    static sub(a, b) { return new Vec(a.x - b.x, a.y - b.y); }
  }
  const original = vm.createContext({ createVector: (x, y) => new Vec(x, y), p5: { Vector: Vec }, dist: (x, y, a, b) => Math.hypot(x - a, y - b) });
  vm.runInContext(readFileSync(new URL('./fixtures/teacher-boids.js', import.meta.url), 'utf8'), original);
  const reference = vm.runInContext('Object.create(Boid.prototype)', original);
  const a = agent(YUKA, 0, 0, .5, -.2); a.maxForce = .7;
  Object.assign(reference, { pos: new Vec(), vel: new Vec(.5, -.2), perceptionRadius: 4, maxSpeed: 5, maxForce: .7 });
  for (const coordinates of [[], [[1, 0, 2, 3]], [[1, 0, 2, 3], [-2, 1, -1, 0]], [[4, 0, 3, 1], [7, 0, 1, 2]], [[20, 0, 2, 1]]]) {
    const neighbors = coordinates.map(([x, z, vx, vz], i) => agent(YUKA, x, z, vx, vz, i + 1));
    const sourceNeighbors = coordinates.map(([x, z, vx, vz]) => ({ pos: new Vec(x, z), vel: new Vec(vx, vz) }));
    for (const kind of ['align', 'cohesion', 'separation']) {
      const expected = reference[kind]([reference, ...sourceNeighbors]);
      const actual = BoidRules3D[kind](a, [a, ...neighbors]);
      assert.ok(Math.abs(actual.x - expected.x) < 1e-10 && Math.abs(actual.z - expected.y) < 1e-10, kind);
      assert.ok(actual.length() <= a.maxForce + 1e-10);
    }
  }
});

test('boids : alignement moyenne des vitesses, cohésion seek vers le centre, séparation inverse distance', () => {
  const { YUKA, BoidRules3D } = scene(); const a = agent(YUKA);
  const b = agent(YUKA, 1, 0, 0, 2, 1), c = agent(YUKA, 0, 2, 0, 4, 2);
  const align = BoidRules3D.align(a, [b, c]); assert.equal(align.x, 0); assert.equal(align.z, 5);
  const cohesion = BoidRules3D.cohesion(a, [b, c]);
  const expected = new YUKA.Vector3(.5, 0, 1).normalize().multiplyScalar(5); assert.ok(cohesion.distanceTo(expected) < 1e-10);
  const separation = BoidRules3D.separation(a, [b, c]);
  assert.ok(separation.distanceTo(new YUKA.Vector3(-1, 0, -.5).normalize().multiplyScalar(5)) < 1e-10);
});

test('boids : perception stricte, aucun voisin, vitesses opposées et positions confondues', () => {
  const { YUKA, BoidRules3D } = scene(); const a = agent(YUKA, 0, 0, 1, 0), b = agent(YUKA, 4, 0, 1, 0, 1);
  assert.equal(BoidRules3D.align(a, [a, b]).length(), 0);
  assert.equal(BoidRules3D.separation(a, [b]).length(), 0);
  assert.ok(BoidRules3D.cohesion(a, [b]).x > 0);
  b.position.x = 8; assert.equal(BoidRules3D.cohesion(a, [b]).length(), 0);
  b.position.x = 1; b.velocity.set(1, 0, 0); const c = agent(YUKA, -1, 0, -1, 0, 2);
  assert.equal(BoidRules3D.align(a, [b, c]).x, -1);
  a.velocity.set(0, 0, 0); b.position.copy(a.position); b.velocity.set(0, 0, 0);
  const opposite = BoidRules3D.separation(b, [a]); const force = BoidRules3D.separation(a, [b]);
  assert.ok(Number.isFinite(force.length()) && force.x * opposite.x < 0);
});

test('boids : forces 3D limitées, calculs sans mutation et composition pondérée', () => {
  const { YUKA, BoidRules3D, WeightedSteering3D } = scene();
  const a = agent(YUKA); a.maxForce = .25; const b = agent(YUKA, 1, 1, 2, 3, 1); b.position.y = 2;
  const position = a.position.clone(), velocity = a.velocity.clone(), behaviors = [];
  for (const kind of ['align', 'cohesion', 'separation']) {
    const force = BoidRules3D[kind](a, [b]); assert.ok(force.length() <= .25 + 1e-10);
    behaviors.push({ active: true, weight: 3, calculate(v, f) { f.copy(force); } });
  }
  const total = new YUKA.Vector3(); new WeightedSteering3D(behaviors).calculate(a, total, 0);
  assert.ok(total.length() <= .25 + 1e-10); assert.ok(a.position.equals(position) && a.velocity.equals(velocity));
});

test('boids : drones Vehicle, chemins indépendants et voisinage par groupe avec séparation entre groupes', () => {
  const { YUKA, World3D, FlockDrone3D } = scene(); const world = new World3D(() => .5);
  const first = world.addFlock(3), second = world.addFlock(2); world.prepareNeighborhoods();
  assert.ok(first.every(drone => drone instanceof YUKA.Vehicle && drone instanceof FlockDrone3D));
  assert.ok(first.every(drone => drone.update === YUKA.Vehicle.prototype.update));
  assert.notEqual(first[0].follow.path, first[1].follow.path);
  assert.ok(first[0].flockNeighbors.every(drone => drone.groupId === first[0].groupId));
  assert.ok(!first[0].flockNeighbors.includes(first[0]));
  assert.ok(first[0].spacingNeighbors.includes(second[0]));
  second[0].position.set(100, 5.5, 100); world.prepareNeighborhoods();
  assert.ok(!first[0].spacingNeighbors.includes(second[0]));
  assert.ok(first[0].follow.path._waypoints.every(point => point.y === 5.5));
});

test('boids : poids appliqués immédiatement et hérités, zéro désactive les forces, bornes refusées', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(); world.addFlock(3);
  world.setFlockWeights(.3, 1.8, 5); world.addFlock(2);
  assert.ok(world.boids.every(drone => drone.align.weight === .3 && drone.cohesion.weight === 1.8 && drone.separation.weight === 5));
  world.setFlockWeights(0, 0, 0); const drone = world.boids[0];
  drone.follow.weight = drone.onPath.weight = 0;
  const force = new YUKA.Vector3(); drone.composition.calculate(drone, force, 1 / 60); assert.equal(force.length(), 0);
  for (const values of [[NaN, 1, 3], [3, 1, 3], [1, -1, 3], [1, 1, 16]]) assert.throws(() => world.setFlockWeights(...values), { name: 'RangeError' });
});

test('boids : nuées plafonnées et retrait complet du moteur sans garder des agents fantômes', () => {
  const { World3D } = scene(); const world = new World3D();
  for (let i = 0; i < 4; i++) assert.equal(world.addFlock().length, 18);
  assert.equal(world.boids.length, 72); assert.equal(world.addFlock().length, 0);
  world.clearFlocks(); assert.equal(world.boids.length, 0); assert.equal(world.agents.length, 0); assert.equal(world.manager.entities.length, 0);
  assert.equal(world.addFlock().length, 18);
  for (const count of [0, 19, NaN, 1.5]) assert.throws(() => world.addFlock(count), { name: 'RangeError' });
});

test('boids : altitude corrigée par une force bornée sans déplacer le drone', () => {
  const { YUKA, AltitudeHold3D } = scene(); const a = agent(YUKA); a.maxForce = 2; a.position.y = 3;
  const position = a.position.clone(), force = new YUKA.Vector3(); const behavior = new AltitudeHold3D(5.5);
  behavior.calculate(a, force); assert.equal(force.y, 2); assert.ok(a.position.equals(position));
  a.position.y = 8; behavior.calculate(a, force); assert.equal(force.y, -2);
  a.position.y = 5.5; behavior.calculate(a, force); assert.equal(force.length(), 0);
});

test('boids : un drone isolé se rassemble sans imposer sa position, cohésion zéro désactive ce rappel', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(() => .5), drones = world.addFlock(3);
  drones[0].position.set(0, 5.5, 0); drones[1].position.set(0, 5.5, 0); drones[2].position.set(20, 5.5, 0);
  drones[2].velocity.set(0, 0, 0); const before = drones[2].position.clone();
  world.prepareNeighborhoods(); assert.equal(drones[2].flockNeighbors.length, 0); assert.equal(drones[2].regroup.active, true);
  const force = new YUKA.Vector3(); drones[2].regroup.calculate(drones[2], force, 1 / 60);
  assert.ok(force.x < 0); assert.ok(drones[2].position.equals(before));
  world.setFlockWeights(1.5, 0, 3); assert.equal(drones[2].regroup.weight, 0);
});

test('boids : groupe vivant, altitude sûre, forces/vitesses bornées et un seul update par pas', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(); const drones = world.addFlock();
  let calls = 0; const inherited = drones[0].update;
  drones[0].update = function(dt) { calls++; return inherited.call(this, dt); };
  const start = drones[0].position.clone(); let social = 0;
  for (let i = 0; i < 1200; i++) {
    world.update(1 / 60);
    for (const drone of drones) {
      assert.ok(Number.isFinite(drone.position.length()));
      assert.ok(drone.position.y > 3.5 && drone.position.y < 7.5, `altitude ${drone.position.y}`);
      assert.ok(drone.getSpeed() <= drone.maxSpeed + 1e-10);
      social += drone.flockNeighbors.length;
      const force = new YUKA.Vector3(); drone.composition.calculate(drone, force, 0); assert.ok(force.length() <= drone.maxForce + 1e-10);
    }
  }
  assert.equal(calls, 1200); assert.ok(social > drones.length * 1200 * 2, `voisins moyens : ${social / (drones.length * 1200)}`);
  const center = drones.reduce((sum, drone) => sum.add(drone.position), new YUKA.Vector3()).divideScalar(drones.length);
  const spread = drones.reduce((sum, drone) => sum + drone.position.distanceTo(center), 0) / drones.length;
  assert.ok(spread < 9, `dispersion du groupe : ${spread}`);
  assert.ok(drones[0].position.distanceTo(start) > 8);
});
