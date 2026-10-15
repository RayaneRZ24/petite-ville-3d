import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function scene() {
  let seed = 42; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const context = vm.createContext({ console, rng }); vm.runInContext('Math.random = rng;', context);
  for (const file of ['libraries/3d/yuka.js', '3d/circuit3d.js', '3d/weightedSteering3d.js', '3d/localSeparation3d.js',
    '3d/teacherAvoidance3d.js', '3d/obstacle3d.js', '3d/barrier3d.js', '3d/police3d.js', '3d/overtake3d.js',
    '3d/roadContainment3d.js', '3d/collisionSafety3d.js','3d/trafficSteering3d.js','3d/trafficContacts3d.js', '3d/trafficVehicle3d.js','3d/busService3d.js', '3d/bus3d.js',
    '3d/boidRules3d.js', '3d/altitudeHold3d.js', '3d/flockDrone3d.js', '3d/streetNavigation3d.js','3d/townPerson3d.js','3d/robber3d.js','3d/incidentCar3d.js','3d/responseCar3d.js','3d/streetBarricade3d.js','3d/cityIncident3d.js','3d/world3d.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return vm.runInContext('({YUKA, Bus3D, TrafficVehicle3D, World3D})', context);
}

test('bus : un seul Vehicle rigide réutilise le suivi, séparation et sécurité du trafic', () => {
  const { YUKA, Bus3D, TrafficVehicle3D, World3D } = scene(); const world = new World3D(), bus = world.addBus();
  assert.ok(bus instanceof Bus3D && bus instanceof TrafficVehicle3D && bus instanceof YUKA.Vehicle);
  assert.equal(bus.update, YUKA.Vehicle.prototype.update); assert.equal(world.manager.entities.length, 1);
  assert.equal(world.snakes.length, 0); assert.equal(world.agents.length, 1); assert.equal(world.buses[0], bus);
  assert.ok(world.traffic.includes(bus)); assert.equal(bus.boundingRadius, 1.1); assert.equal(bus.baseSpeed, 3.6);
  assert.ok(bus.composition.behaviors.includes(bus.wander)); assert.ok(bus.safety && bus.road && bus.avoidance);
});

test('bus : poids conservés par la boucle et hérités par T/nouvelles créations', () => {
  const { World3D } = scene(); const world = new World3D(); const first = world.addBus();
  world.setWeights(1.2, 3, .8); world.update(1 / 60); const next = world.addBus();
  assert.equal(first.follow.weight, 1.2); assert.equal(first.onPath.weight, 1.2);
  for (const bus of [first, next]) {
    assert.equal(bus.followWeight, 1.2); assert.equal(bus.separation.weight, 36); assert.equal(bus.wander.weight, .8);
  }
  world.setWeights(0, 0, 0); world.update(1 / 60);
  assert.ok(world.buses.every(bus => bus.wander.weight === 0 && bus.separation.weight === 0 && bus.follow.weight === 0));
  assert.throws(() => next.setWeights(NaN, 1, 1), { name: 'RangeError' });
});

test('bus : perception et forces de séparation avec les voitures, force finale bornée', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(), bus = world.addBus(), car = world.addVehicle();
  car.position.copy(bus.position).add(new YUKA.Vector3(1, 0, 0)); world.prepareNeighborhoods();
  assert.ok(bus.neighbors.includes(car));
  const force = new YUKA.Vector3(); bus.separation.calculate(bus, force); assert.ok(force.x < 0);
  bus.steering.calculate(1 / 60, force); assert.ok(force.length() <= bus.maxForce + 1e-8);
});

test('bus : rayon adapté à la sécurité, aucune mutation pendant le calcul', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(), bus = world.addBus();
  const before = bus.position.clone(), velocity = bus.velocity.clone(), force = new YUKA.Vector3();
  bus.steering.calculate(1 / 60, force); assert.ok(bus.position.equals(before) && bus.velocity.equals(velocity));
  assert.ok(force.length() <= bus.maxForce + 1e-8);
  assert.equal(world.addObstacle(bus.position), null);
});

test('bus : circule avec sa taille réelle, évite les barrages et ne reste pas figé', () => {
  const { World3D, YUKA } = scene(); const world = new World3D();
  for (const index of [4, 15, 26, 37, 48, 59]) {
    const spawn = world.circuit.spawn(index);
    spawn.point.add(new YUKA.Vector3(spawn.direction.z * 1.6, 0, -spawn.direction.x * 1.6)); world.addObstacle(spawn.point);
  }
  const bus = world.addBus(); let previous = bus.position.clone(), traveled = 0, calls = 0;
  const inherited = bus.update; bus.update = function(dt) { calls++; return inherited.call(this, dt); };
  for (let i = 0; i < 1200; i++) {
    world.update(1 / 60);
    traveled += bus.position.distanceTo(previous); previous.copy(bus.position);
    assert.ok(bus.position.distanceTo(world.circuit.frameAt(bus.position).point) + bus.boundingRadius < world.circuit.radius);
    assert.ok(world.obstacles.every(obstacle => bus.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + bus.boundingRadius));
    assert.ok(bus.getSpeed() <= bus.maxSpeed + 1e-8);
  }
  assert.equal(calls, 1200); assert.ok(traveled > 25, `trajet du bus ${traveled}`);
});
