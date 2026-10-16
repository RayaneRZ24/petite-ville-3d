import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function scene() {
  let seed = 1729;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const isolatedMath=Object.create(Math);isolatedMath.random=rng;
  const context = vm.createContext({ rng, console, Math:isolatedMath });
  // Même Math natif, avec random propre au test ; éviter le proxy du global VM
  // dans les milliers de prévisions de collision. Le Math de Node reste intact.
  vm.runInContext('Math.random = rng;', context);
  for (const file of ['libraries/3d/yuka.js', '3d/circuit3d.js','3d/cityRoute3d.js','3d/building3d.js','3d/busStop3d.js','3d/passenger3d.js','3d/tree3d.js','3d/streetLamp3d.js','3d/fairground3d.js','3d/shop3d.js','3d/citySolids3d.js','3d/streetNetwork3d.js','3d/cityMap3d.js','3d/busMission3d.js', '3d/weightedSteering3d.js',
    '3d/localSeparation3d.js', '3d/chainFollow3d.js', '3d/teacherAvoidance3d.js', '3d/obstacle3d.js', '3d/barrier3d.js', '3d/police3d.js', '3d/overtake3d.js', '3d/roadContainment3d.js', '3d/collisionSafety3d.js', '3d/snakeHead3d.js', '3d/snakeSegment3d.js',
    '3d/snake3d.js','3d/trafficSteering3d.js','3d/trafficContacts3d.js', '3d/trafficVehicle3d.js','3d/busService3d.js', '3d/bus3d.js', '3d/boidRules3d.js', '3d/altitudeHold3d.js', '3d/flockDrone3d.js', '3d/streetNavigation3d.js','3d/townPerson3d.js','3d/robber3d.js','3d/incidentCar3d.js','3d/responseCar3d.js','3d/streetBarricade3d.js','3d/cityIncident3d.js','3d/world3d.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
    if(file==='libraries/3d/yuka.js')vm.runInContext('const YUKA=globalThis.YUKA;',context);
  }
  return { context, ...vm.runInContext('({ YUKA, Circuit3D, WeightedSteering3D, LocalSeparation3D, World3D, Snake3D, TeacherAvoidance3D, Obstacle3D, Barrier3D, Police3D, Overtake3D })', context) };
}

test('3D : vrai Yuka, serpents et chaque anneau héritent de Vehicle', () => {
  const { YUKA, World3D } = scene(); const world = new World3D(() => .3), snake = world.addSnake();
  assert.ok(snake instanceof YUKA.Vehicle);
  assert.equal(snake.head, snake.anneaux[0]); assert.notEqual(snake.head, snake);
  assert.equal(snake.anneaux.length, 9);
  assert.ok(snake.anneaux.every(agent => agent instanceof YUKA.Vehicle && agent.update === YUKA.Vehicle.prototype.update));
  assert.ok(snake.head.follow instanceof YUKA.FollowPathBehavior);
  assert.ok(snake.head.onPath instanceof YUKA.OnPathBehavior);
  assert.ok(snake.head.wander instanceof YUKA.WanderBehavior);
  assert.ok(snake.head.separation instanceof YUKA.SeparationBehavior);
  assert.ok(snake.anneaux[1].follow instanceof YUKA.ArriveBehavior);
});

test('3D : circuit fermé et curseur de chemin indépendant pour chaque serpent', () => {
  const { World3D } = scene(); const world = new World3D(() => .3);
  const a = world.addSnake(), b = world.addSnake();
  assert.equal(world.circuit.points.length, 64);
  assert.equal(a.head.follow.path.loop, true);
  assert.notEqual(a.head.follow.path, b.head.follow.path);
  const original = b.head.follow.path.current().clone();
  a.head.follow.path.advance();
  assert.ok(b.head.follow.path.current().equals(original));
  assert.equal(world.manager.entities.length, 18);
});

test('3D : somme pondérée des comportements et limite finale maxForce', () => {
  const { YUKA, WeightedSteering3D } = scene();
  const agent = new YUKA.Vehicle(); agent.maxForce = 5;
  const a = { active: true, weight: 2, calculate(v, f) { f.set(2, 0, 0); } };
  const b = { active: true, weight: 3, calculate(v, f) { f.set(0, 0, 1); } };
  const composition = new WeightedSteering3D([a, b]);
  const force = new YUKA.Vector3(); composition.calculate(agent, force, 1 / 60);
  assert.ok(force.equals(new YUKA.Vector3(4, 0, 3)));
  a.weight = 5; b.weight = 5; composition.calculate(agent, force.set(0, 0, 0), 1 / 60);
  assert.ok(Math.abs(force.length() - agent.maxForce) < 1e-12);
  a.active = false; b.weight = 0; composition.calculate(agent, force.set(0, 0, 0), 1 / 60);
  assert.equal(force.length(), 0);
});

test('3D : perception locale, exclusion du corps propre et présence des autres véhicules', () => {
  const { World3D } = scene(); const world = new World3D(() => .3);
  const snake = world.addSnake(), other = world.addSnake(), car = world.addVehicle();
  car.position.copy(snake.head.position);
  world.prepareNeighborhoods();
  assert.ok(snake.head.neighbors.includes(car));
  assert.ok(snake.head.neighbors.includes(other.head));
  assert.ok(snake.anneaux.every(agent => !agent.neighbors.some(neighbor => neighbor.ownerId === snake.ownerId)));
  car.position.set(1000, 0, 1000); world.prepareNeighborhoods();
  assert.equal(snake.head.neighbors.includes(car), false);
});

test('3D : séparation à courte distance et positions confondues sans NaN', () => {
  const { YUKA, LocalSeparation3D } = scene();
  const a = new YUKA.Vehicle(), b = new YUKA.Vehicle(); a.agentId = 0; b.agentId = 1;
  a.neighbors = [b]; b.neighbors = [a]; b.position.set(1, 0, 0);
  const behavior = new LocalSeparation3D(), force = new YUKA.Vector3();
  behavior.calculate(a, force, 1 / 60); assert.ok(force.x < 0);
  b.position.copy(a.position);
  behavior.calculate(a, force.set(0, 0, 0), 1 / 60);
  const opposite = new YUKA.Vector3(); behavior.calculate(b, opposite, 1 / 60);
  assert.ok(Number.isFinite(force.length()) && force.length() > 0);
  assert.ok(force.x * opposite.x < 0);
});

test('3D : poids appliqués à toutes les têtes et anneaux, conservés aux créations', () => {
  const { World3D } = scene(); const world = new World3D(); world.addSnake();
  world.setWeights(.8, 3, 1.2); world.addSnake();
  for (const snake of world.snakes) {
    assert.equal(snake.head.follow.weight, .8); assert.equal(snake.head.onPath.weight, .8);
    assert.equal(snake.head.wander.weight, 1.2);
    assert.ok(snake.anneaux.every(agent => agent.separation.weight === 36));
  }
  world.setWeights(0, 0, 0);
  assert.ok(world.snakes.every(snake => snake.head.wander.weight === 0));
  for (const values of [[NaN, 1, 1], [-1, 0, 0], [1, 6, 1], [1, 1, Infinity]]) {
    assert.throws(() => world.setWeights(...values), { name: 'RangeError' });
  }
});

test('3D : mouvement par update hérité exactement une fois par pas, pas de déplacement imposé', () => {
  const { World3D } = scene(); const world = new World3D(() => .3), snake = world.addSnake();
  const calls = Array(9).fill(0);
  snake.anneaux.forEach((agent, i) => {
    const update = agent.update;
    agent.update = function(dt) { calls[i]++; return update.call(this, dt); };
  });
  const before = snake.head.position.clone();
  world.prepareNeighborhoods(); assert.ok(snake.head.position.equals(before));
  world.update(1 / 60);
  assert.deepEqual(calls, Array(9).fill(1));
  assert.ok(snake.head.position.distanceTo(before) > 0);
});

test('3D : la chaîne avance, les forces et vitesses restent finies et bornées', () => {
  const { YUKA, World3D } = scene(); const world = new World3D(() => .3), snake = world.addSnake();
  let previous = snake.head.position.clone(), distanceTravelled = 0, maxGap = 0;
  const waypoints = new Set();
  for (let i = 0; i < 1200; i++) {
    world.update(1 / 60);
    distanceTravelled += snake.head.position.distanceTo(previous);
    previous.copy(snake.head.position);
    waypoints.add(snake.head.follow.path._index);
    for (let j = 0; j < snake.anneaux.length; j++) {
      const agent = snake.anneaux[j];
      assert.ok(Number.isFinite(agent.position.length()));
      assert.ok(Math.abs(agent.position.y) < 1e-8);
      assert.ok(agent.getSpeed() <= agent.maxSpeed + 1e-8);
      const force = new YUKA.Vector3(); agent.composition.calculate(agent, force, 0);
      assert.ok(force.length() <= agent.maxForce + 1e-8);
      if (j) maxGap = Math.max(maxGap, agent.position.distanceTo(snake.anneaux[j - 1].position));
    }
  }
  assert.ok(distanceTravelled > 80, `distance parcourue : ${distanceTravelled}`);
  assert.ok(waypoints.size > 20, `points de chemin atteints : ${waypoints.size}`);
  assert.ok(maxGap < 5, `chaîne étirée : ${maxGap}`);
});

test('3D : pas fixe indépendant de la cadence, pauses et temps invalides ignorés', () => {
  const worlds = [scene(), scene()].map(s => { const world = new s.World3D(() => .3); world.addSnake(); return world; });
  for (let i = 0; i < 120; i++) worlds[0].update(1 / 60);
  for (let i = 0; i < 60; i++) worlds[1].update(1 / 30);
  assert.ok(worlds[0].snakes[0].head.position.distanceTo(worlds[1].snakes[0].head.position) < 1e-9);
  const before = worlds[0].snakes[0].head.position.clone();
  for (const dt of [0, -1, NaN, Infinity]) worlds[0].update(dt);
  assert.ok(worlds[0].snakes[0].head.position.equals(before));
});

test('3D : wander actif produit un changement, son poids nul conserve sa cible', () => {
  const { World3D } = scene(); const world = new World3D(() => .3), snake = world.addSnake();
  const initial = snake.head.wander._targetLocal.clone(); world.update(1 / 60);
  assert.ok(!snake.head.wander._targetLocal.equals(initial));
  world.setWeights(2, 2.5, 0);
  const stopped = snake.head.wander._targetLocal.clone(); world.update(1 / 60);
  assert.ok(snake.head.wander._targetLocal.equals(stopped));
});

function app(width = 1200) {
  const s = scene(), nodes = new Map(), events = {};
  const initial = { 'bus-follow': '2', 'bus-separation': '2.5', 'bus-wander': '.5', 'flock-align': '1.5', 'flock-cohesion': '1', 'flock-separation': '3' };
  const document = { activeElement: null,
    addEventListener(name, callback) { events[name] = callback; },
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { value: initial[id], hidden: false, events: {}, attributes: {},
        addEventListener(name, callback) { this.events[name] = callback; },
        setAttribute(name, value) { this.attributes[name] = value; } });
      return nodes.get(id);
    } };
  Object.assign(s.context, { document, performance: { now: () => 1000 }, innerWidth: width,
    addEventListener(name, callback) { events[name] = callback; },
    requestAnimationFrame(callback) { events.frame = callback; },
    NeuralLabPortal3D: class { opened=false; },
    VenueLife3D: class { update(){} },
    CityAudio3D: class { update(){} suspend(){} },
    Attractions3D: class { opened=false;ride=false;update(){} },
    Scene3D: class {
      constructor() { this.orbit = { yaw: .58, pitch: .7, distance: 74 }; }
      setCameraMode(mode) { this.cameraMode = mode; }
      setPoliceCameraMode(mode) { this.cameraMode = mode; }
      setDroneCamera(next) {this.droneNext=next;this.cameraMode='drone';}
      focusIncident(){this.incidentFocused=true;}
      vehicleCamera={selected:null,select(vehicle){this.selected=vehicle;}};
      addSnake() {} addBus() {} addVehicle() {} addObstacle() {} addDrone() {} clearDrones() {} render() {} resize() {}
    },
  });
  s.context.window = s.context;
  vm.runInContext(readFileSync(new URL('../3d/app3d.js', import.meta.url), 'utf8'), s.context);
  return { ...s.context.pathFollowing3D, state: s.context.pathFollowing3D, nodes, events, document };
}

test('3D interface : T, sliders, pause, debug et caméras pilotent la vraie simulation', () => {
  const a = app(); assert.equal(a.world.snakes.length, 0); assert.equal(a.world.buses.length, 1); assert.equal(a.world.traffic.length, 16);
  a.nodes.get('bus-wander').value = '1.2'; a.nodes.get('bus-wander').events.input();
  a.events.keydown({ key: 't' });
  assert.equal(a.world.buses.length, 2); assert.equal(a.world.buses[1].wander.weight, 1.2);
  a.nodes.get('add-bus').events.click(); assert.equal(a.world.buses.length, 3);
  a.events.keydown({ key: 'd' }); assert.equal(a.state.debug, true);
  a.document.activeElement = { tagName: 'INPUT' }; a.events.keydown({ key: 't' });
  assert.equal(a.world.buses.length, 3);
  const pause = a.nodes.get('pause'), before = a.world.buses[0].position.clone();
  pause.events.click({ currentTarget: pause }); a.events.frame(1500);
  assert.equal(a.state.paused, true); assert.ok(a.world.buses[0].position.equals(before));
  pause.events.click({ currentTarget: pause }); a.events.frame(1600);
  assert.ok(!a.world.buses[0].position.equals(before));
  a.nodes.get('camera-top').events.click(); assert.equal(a.view.orbit.pitch, .08);
  a.nodes.get('camera-reset').events.click(); assert.equal(a.view.orbit.pitch, .8);
  a.document.activeElement = null;
  for (const [key, mode] of [['1', 'first'], ['3', 'third'], ['0', 'free'], ['Escape', 'free']]) {
    a.events.keydown({ key }); assert.equal(a.view.cameraMode, mode);
  }
  a.nodes.get('camera-first').events.click(); assert.equal(a.view.cameraMode, 'first');
  a.nodes.get('camera-third').events.click(); assert.equal(a.view.cameraMode, 'third');
  for (const [key, mode] of [['p', 'police-first'], ['O', 'police-third']]) {
    a.events.keydown({ key }); assert.equal(a.view.cameraMode, mode);
  }
  a.nodes.get('camera-police-first').events.click(); assert.equal(a.view.cameraMode, 'police-first');
  a.nodes.get('camera-police-third').events.click(); assert.equal(a.view.cameraMode, 'police-third');
  a.nodes.get('camera-third').events.click();
  a.events.keydown({key:'v'});assert.equal(a.view.cameraMode,'drone');
  a.events.keydown({key:'n'});assert.equal(a.view.droneNext,true);
  a.events.keydown({key:'m'});assert.equal(a.world.mission.state,'driving');assert.equal(a.view.vehicleCamera.selected,a.world.buses[0]);
  a.events.keydown({key:' '});assert.equal(a.world.mission.state,'driving');
  a.nodes.get('camera-third').events.click();
  a.document.activeElement = { tagName: 'INPUT' }; a.events.keydown({ key: '0' }); assert.equal(a.view.cameraMode, 'third');
});

test('3D interface : liste de voitures et bus, sélection et nouveaux véhicules', () => {
  const a=app(),select=a.nodes.get('vehicle-select');
  assert.equal((select.innerHTML.match(/<option /g)||[]).length,17);
  const car=a.world.traffic.find(vehicle=>!vehicle.isBus);
  select.value=String(car.agentId);select.events.change();
  assert.equal(a.view.vehicleCamera.selected,car);assert.equal(a.view.cameraMode,'third');
  a.nodes.get('add-bus').events.click();a.events.frame(100);
  assert.equal((select.innerHTML.match(/<option /g)||[]).length,18);
  const bus=a.world.buses[1];select.value=String(bus.agentId);select.events.change();
  assert.equal(a.view.vehicleCamera.selected,bus);
  select.value='invalid';select.events.change();assert.equal(a.view.vehicleCamera.selected,bus);
  a.view.vehicleCamera.select(car);a.events.frame(100);assert.equal(select.value,String(car.agentId));
});

test('3D interface : H et boutons du braquage, focus et commandes pendant la pause',()=>{
 const a=app();a.document.activeElement={tagName:'SELECT'};a.events.keydown({key:'h'});assert.equal(a.world.incident.state,'idle');
 a.document.activeElement=null;a.nodes.get('pause').events.click({currentTarget:a.nodes.get('pause')});a.events.keydown({key:'h'});
 assert.equal(a.world.incident.state,'approach');assert.equal(a.world.incident.cars.length,4);assert.equal(a.world.incident.robbers.length,3);
 a.nodes.get('start-incident').events.click();assert.equal(a.world.incident.cars.length,4);
 a.nodes.get('incident-camera').events.click();assert.equal(a.view.incidentFocused,true);
 a.nodes.get('chase-camera').events.click();assert.equal(a.view.vehicleCamera.selected,a.world.incident.getaway);assert.equal(a.view.cameraMode,'third');
 a.events.frame(2000);assert.equal(a.world.incident.elapsed,0);assert.match(a.nodes.get('vehicle-select').innerHTML,/Voiture de fuite/);assert.match(a.nodes.get('vehicle-select').innerHTML,/Police/);
});

test('3D interface : réglages repliés sur mobile et état accessible du bouton', () => {
  const a = app(390), panel = a.nodes.get('controls'), toggle = a.nodes.get('settings3d-toggle');
  assert.equal(panel.hidden, true); assert.equal(toggle.attributes['aria-expanded'], 'false');
  toggle.events.click(); assert.equal(panel.hidden, false); assert.equal(toggle.attributes['aria-expanded'], 'true');
  toggle.events.click(); assert.equal(panel.hidden, true);
});

test('3D interface : B, sliders des trois forces et retrait des nuées', () => {
  const a = app(); assert.equal(a.world.boids.length, 18);
  a.nodes.get('flock-cohesion').value = '1.7'; a.nodes.get('flock-cohesion').events.input();
  a.nodes.get('flock-align').value = '.9'; a.nodes.get('flock-align').events.input();
  a.nodes.get('flock-separation').value = '4.2'; a.nodes.get('flock-separation').events.input();
  a.events.keydown({ key: 'b' }); assert.equal(a.world.boids.length, 36);
  assert.ok(a.world.boids.every(drone => drone.cohesion.weight === 1.7 && drone.align.weight === .9 && drone.separation.weight === 4.2));
  a.document.activeElement = { tagName: 'INPUT' }; a.events.keydown({ key: 'b' }); assert.equal(a.world.boids.length, 36);
  a.nodes.get('clear-flocks').events.click(); assert.equal(a.world.boids.length, 0);
  assert.equal(a.world.agents.length, 19); assert.equal(a.world.people.length,3); assert.equal(a.world.traffic.length, 16); assert.equal(a.world.buses.length, 1);
  a.nodes.get('add-flock').events.click(); assert.equal(a.world.boids.length, 18);
});

test('évitement : mêmes forces que le vrai avoid() fourni, pour les trois points et les seuils', () => {
  const { YUKA, TeacherAvoidance3D } = scene();
  // Adaptateur minimal p5 pour exécuter le fichier du professeur intact.
  class Vector2 {
    constructor(x, y) { this.x = x; this.y = y; }
    copy() { return new Vector2(this.x, this.y); }
    mult(n) { this.x *= n; this.y *= n; return this; }
    dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
    setMag(n) { const length = Math.hypot(this.x, this.y); return length ? this.mult(n / length) : this; }
    static add(a, b) { return new Vector2(a.x + b.x, a.y + b.y); }
    static sub(a, b) { return new Vector2(a.x - b.x, a.y - b.y); }
  }
  const provided = vm.createContext({ createVector: (x, y) => new Vector2(x, y), p5: { Vector: Vector2 }, vehicules: [] });
  vm.runInContext(readFileSync(new URL('./fixtures/teacher-avoidance.js', import.meta.url), 'utf8'), provided);
  const reference = vm.runInContext('new Vehicle(0, 0)', provided);
  reference.vel = new Vector2(4 / 60, 0);
  reference.maxForce = 18;
  reference.largeurZoneEvitementDevantVaisseau = 1.05;
  const agent = new YUKA.Vehicle(); agent.velocity.set(4, 0, 0); agent.maxForce = 18; agent.boundingRadius = .7;
  const cases = [
    [[2, .3, .8]], [[1, .3, .8]], [[-.1, .3, .8]], // ahead, halfAhead, position
    [[2, 1.85, .8]], [[2, 1.85 - 1e-6, .8]], [[2, 1.85 + 1e-6, .8]],
    [[20, 20, .8]], [[2, 0, .8]], [[-.1, 2, .1], [2, .3, .8]],
  ];
  for (const coordinates of cases) {
    const expected = reference.avoid(coordinates.map(([x, z, r]) => ({ pos: new Vector2(x, z), r })));
    const behavior = new TeacherAvoidance3D(coordinates.map(([x, z, r]) => ({ position: new YUKA.Vector3(x, 0, z), boundingRadius: r })));
    const force = behavior.calculate(agent, new YUKA.Vector3());
    assert.ok(Math.abs(force.x - expected.x) < 1e-10 && Math.abs(force.z - expected.y) < 1e-10, JSON.stringify(coordinates));
    assert.equal(force.y, 0);
    assert.ok(force.length() <= agent.maxForce / 2 + 1e-10);
  }
});

test('évitement : aucun obstacle, vitesse nulle et centre confondu restent finis, sans déplacement', () => {
  const { YUKA, TeacherAvoidance3D } = scene();
  const agent = new YUKA.Vehicle(); agent.maxForce = 10; agent.boundingRadius = .5;
  const before = agent.position.clone();
  const force = new YUKA.Vector3(99, 0, 0);
  assert.equal(new TeacherAvoidance3D([]).calculate(agent, force).length(), 0);
  const obstacle = { position: new YUKA.Vector3(.2, 0, 0), boundingRadius: .8 };
  const behavior = new TeacherAvoidance3D([obstacle]);
  behavior.calculate(agent, force); assert.equal(force.x, -5);
  assert.equal(behavior.detected, true);
  obstacle.position.copy(agent.position); behavior.calculate(agent, force);
  assert.equal(force.length(), 0); assert.ok(agent.position.equals(before));
});

test('évitement : priorité Yuka et maxForce final, reprise du suivi hors obstacle', () => {
  const { YUKA, World3D } = scene(); const world = new World3D(() => .3);
  const car = world.addVehicle();
  const frame = world.circuit.frameAt(car.position);
  car.velocity.copy(frame.direction).multiplyScalar(4);
  const obstacle = { position: car.position.clone().add(frame.direction.clone().multiplyScalar(2)).add(frame.normal.clone().multiplyScalar(.4)), boundingRadius: 1.4 };
  world.obstacles.push(obstacle);
  const force = new YUKA.Vector3();
  car.safety.intent.calculate(1 / 60, force);
  assert.equal(car.avoidance.detected, true); assert.ok(force.dot(frame.normal) < 0);
  assert.ok(Math.abs(force.length() - car.maxForce) < 1e-8);
  for (const item of world.obstacles) item.position.set(100, 0, 100);
  car.safety.intent.calculate(1 / 60, force);
  assert.equal(car.avoidance.detected, false);
  assert.ok(force.length() > 0 && force.length() <= car.maxForce + 1e-8);
});

test('obstacles : entités Vehicle statiques, perçues par chaque anneau et par les nouveaux agents', () => {
  const { YUKA, World3D } = scene(); const world = new World3D(() => .3);
  const snake = world.addSnake(), car = world.addVehicle();
  const obstacle = world.addObstacle(new YUKA.Vector3(5, 0, 6));
  assert.ok(obstacle instanceof YUKA.Vehicle);
  assert.ok(!world.agents.includes(obstacle));
  for (const agent of [...snake.anneaux, car, world.addVehicle(), ...world.addSnake().anneaux]) {
    assert.equal(agent.avoidance.obstacles, world.obstacles);
    assert.equal(agent.steering.behaviors[0], agent.safety || agent.avoidance);
  }
  const before = obstacle.position.clone(); world.update(.1);
  assert.ok(obstacle.position.equals(before));
  for (const radius of [0, -1, NaN, Infinity]) assert.throws(() => world.addObstacle(before, radius), { name: 'RangeError' });
  assert.throws(() => world.addObstacle(new YUKA.Vector3(NaN, 0, 0)), { name: 'RangeError' });
});

test('trafic : vitesses différentes, reproductibles et respectées par la locomotion', () => {
  const { World3D } = scene(); let step = 0;
  const world = new World3D(() => (step++ % 9) / 9);
  const cars = Array.from({ length: 12 }, () => world.addVehicle());
  assert.ok(new Set(cars.map(car => car.maxSpeed)).size > 5);
  for (const car of cars) {
    assert.ok(car.maxSpeed >= 2.8 && car.maxSpeed <= 7.8);
    assert.equal(car.velocity.length(), 0);
  }
  for (let i = 0; i < 600; i++) world.update(1 / 60);
  assert.ok(cars.every(car => car.getSpeed() <= car.maxSpeed + 1e-8 && Number.isFinite(car.position.length())));
});

test('trafic : séparation active entre voitures, loin et à positions confondues', () => {
  const { YUKA, World3D } = scene(); const world = new World3D(() => .3);
  const a = world.addVehicle(), b = world.addVehicle();
  a.position.set(0, 0, 0); b.position.set(1, 0, 0); world.prepareNeighborhoods();
  const force = new YUKA.Vector3(); a.separation.calculate(a, force);
  assert.ok(force.x < 0 && a.separation.weight > 0);
  b.position.copy(a.position); world.prepareNeighborhoods();
  a.separation.calculate(a, force.set(0, 0, 0)); assert.ok(force.length() > 0);
  b.position.set(20, 0, 0); world.prepareNeighborhoods();
  a.separation.calculate(a, force.set(0, 0, 0)); assert.equal(force.length(), 0);
});

test('interface : trois postes organisés et debug sans changer la simulation', () => {
  const a = app(); assert.equal(a.world.barriers.length, 3); assert.equal(a.world.police.length, 3);
  assert.equal(a.world.agents.length, 37);
  const before = a.world.agents.map(agent => agent.position.clone());
  a.events.keydown({ key: 'd' });
  assert.ok(a.world.agents.every((agent, i) => agent.position.equals(before[i])));
});

test('barrages ville : trois maximum, espacés sur des lignes droites et orientés avec la route',()=>{
  const {world}=app();const count=world.obstacles.length;
  for(const barrier of world.barriers){
    const frame=world.circuit.frameAt(barrier.position),direction=new (scene().YUKA.Vector3)();
    barrier.getDirection(direction);
    assert.ok(Math.abs(frame.direction.x)<1e-8||Math.abs(frame.direction.z)<1e-8);
    assert.ok(direction.dot(frame.direction)>.999);
    assert.ok(Math.abs(barrier.position.distanceTo(frame.point)-1.6)<1e-8);
    for(const other of world.barriers)if(other!==barrier)assert.ok(barrier.position.distanceTo(other.position)>15);
  }
  assert.equal(world.addObstacle(world.circuit.spawn(55).point),null);
  assert.equal(world.barriers.length,3);assert.equal(world.police.length,3);assert.equal(world.obstacles.length,count);
});

test('interface : Maj + clic crée un obstacle, clic crée une voiture, glisser tourne seulement la caméra', () => {
  const s = scene(); const world = new s.World3D(() => .3);
  const events = {};
  const canvas = { addEventListener(name, handler) { events[name] = handler; }, focus() {}, setPointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } };
  s.context.THREE = {
    Vector2: class {}, Vector3: class {}, Plane: class {},
    Raycaster: class { constructor() { this.ray = { intersectPlane: () => ({ x: 5, z: 6 }) }; } setFromCamera() {} },
  };
  vm.runInContext(readFileSync(new URL('../3d/scene3d.js', import.meta.url), 'utf8'), s.context);
  const bind = vm.runInContext('Scene3D.prototype.bindCamera', s.context);
  const rendered = [], view = { renderer: { domElement: canvas }, world, camera: {}, orbit: { yaw: 0, pitch: .7 },
    vehicleCamera: { mode: 'free' }, pickSubject() { return null; },
    addObstacle(entity) { rendered.push(entity); }, addVehicle(entity) { rendered.push(entity); } };
  bind.call(view);
  const event = { button: 0, clientX: 50, clientY: 50, pointerId: 1 };
  events.pointerdown(event); events.pointerup({ ...event, shiftKey: true });
  assert.equal(world.barriers.length, 1); assert.equal(world.traffic.length, 0);
  assert.equal(rendered[0], world.obstacles[0]);
  events.pointerdown(event); events.pointerup({ ...event, shiftKey: false });
  assert.equal(world.traffic.length, 1); assert.equal(world.barriers.length, 1);
  assert.equal(rendered[1], world.traffic[0]);
  events.pointerdown(event); events.pointermove({ ...event, clientX: 80 }); events.pointerup({ ...event, clientX: 80, shiftKey: true });
  assert.equal(world.barriers.length, 1); assert.equal(world.traffic.length, 1); assert.notEqual(view.orbit.yaw, 0);
});

function passingFixture() {
  const s = scene(), world = new s.World3D(() => .3);
  const a = world.addVehicle(), b = world.addVehicle();
  a.position.set(0, 0, 0); b.position.set(3, 0, 0);
  a.velocity.set(4, 0, 0); a.maxSpeed = a.baseSpeed = 4;
  b.velocity.set(2.8, 0, 0); b.maxSpeed = b.baseSpeed = 2.8;
  const circuit = { radius: 4.2, frameAt(pos) { return { point: new s.YUKA.Vector3(pos.x, 0, 0),
    direction: new s.YUKA.Vector3(1, 0, 0), normal: new s.YUKA.Vector3(0, 0, 1) }; } };
  world.circuit.frameAt = circuit.frameAt;
  for (const agent of [a, b]) {
    const path = new s.YUKA.Path(); path.add(new s.YUKA.Vector3(1000, 0, 0));
    agent.follow.path = agent.onPath.path = path;
  }
  return { ...s, world, a, b, circuit };
}

test('dépassement : seuil de 100 pixels inclusif et perception devant dans la même voie', () => {
  for (const pixels of [99.999, 100, 100.001]) {
    const { a, b, circuit } = passingFixture();
    a.overtake.prepare(a, [a, b], circuit, () => pixels, 1 / 60, []);
    assert.equal(a.overtake.leader === b, pixels <= 100);
  }
  for (const position of [[-2, 0, 0], [0, 0, 0], [3, 0, 2]]) {
    const { a, b, circuit } = passingFixture(); b.position.set(...position);
    a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
    assert.equal(a.overtake.leader, null);
  }
  const { a, b, circuit } = passingFixture(); b.velocity.set(-3, 0, 0);
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
  assert.equal(a.overtake.leader, null);
});

test('dépassement : choix d’un côté libre, abandon du départ si les deux côtés sont bloqués', () => {
  const { a, b, circuit, YUKA } = passingFixture();
  const blocks = [-1, 1].map(side => ({ position: new YUKA.Vector3(3, 0, side * 2.1), boundingRadius: .7 }));
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, [blocks[0]]);
  assert.equal(a.overtake.side, 1); assert.equal(a.overtake.leader, b);
  const second = passingFixture();
  second.a.overtake.prepare(second.a, [second.a, second.b], second.circuit, () => 50, 1 / 60, blocks);
  assert.equal(second.a.overtake.leader, null);
  assert.equal(second.a.maxSpeed, second.a.baseSpeed);
});

test('dépassement : accélération progressive, force bornée et séparation conservée', () => {
  const { a, b, circuit, YUKA } = passingFixture();
  const before = a.position.clone(), velocity = a.velocity.clone();
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
  assert.ok(a.maxSpeed > a.baseSpeed && a.maxSpeed < a.baseSpeed * 1.65);
  assert.ok(a.position.equals(before) && a.velocity.equals(velocity));
  const force = a.overtake.calculate(a, new YUKA.Vector3());
  assert.ok(force.length() > 0 && force.length() <= a.maxForce + 1e-10);
  assert.ok(force.z < 0);
  assert.equal(a.separation.weight, 14); assert.equal(a.onPath.weight, 0);
  assert.equal(a.steering.behaviors[0], a.safety);
});

test('dépassement : passe réellement une voiture lente sans superposition, puis termine', () => {
  const { world, a, b } = passingFixture(); let started = false, completed = false, maxLateral = 0, clearance = Infinity;
  for (let i = 0; i < 300; i++) {
    world.update(1 / 60);
    started ||= a.overtake.leader === b;
    completed ||= started && a.overtake.leader === null && a.position.x > b.position.x + 2;
    maxLateral = Math.max(maxLateral, Math.abs(a.position.z));
    clearance = Math.min(clearance, a.position.distanceTo(b.position));
    assert.ok(a.getSpeed() <= a.maxSpeed + 1e-8);
  }
  assert.ok(started && completed, `positions : ${a.position.x}, ${b.position.x}`);
  assert.ok(maxLateral > 1, `décalage : ${maxLateral}`);
  assert.ok(clearance > a.boundingRadius + b.boundingRadius, `distance : ${clearance}`);
});

test('dépassement : retour à la vitesse normale, délai de réarmement et durée maximale', () => {
  const { a, b, circuit } = passingFixture();
  a.overtake.prepare(a, [a, b], circuit, () => 50, .5, []);
  const boosted = a.maxSpeed; b.position.x = -3;
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
  assert.equal(a.overtake.leader, null); assert.equal(a.overtake.cooldown, 1);
  assert.ok(a.maxSpeed < boosted && a.maxSpeed > a.baseSpeed);
  assert.equal(a.follow.weight, 2); assert.equal(a.onPath.weight, 2);
  b.position.x = 3;
  a.overtake.prepare(a, [a, b], circuit, () => 50, .1, []);
  assert.equal(a.overtake.leader, null);
  for (let i = 0; i < 200; i++) a.overtake.prepare(a, [a], circuit, () => 50, 1 / 60, []);
  assert.ok(Math.abs(a.maxSpeed - a.baseSpeed) < .02);
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
  a.overtake.elapsed = 8 - 1 / 60;
  a.overtake.prepare(a, [a, b], circuit, () => 50, 1 / 60, []);
  assert.equal(a.overtake.leader, null);
});

test('circuit et barrages : largeur doublée, policiers et barrières immobiles, géométrie de perception', () => {
  const { World3D, Barrier3D, Police3D, YUKA } = scene(); const world = new World3D(() => .3);
  assert.equal(world.circuit.radius, 4.2);
  const spawn = world.circuit.spawn(10), barrier = world.addObstacle(spawn.point);
  assert.ok(barrier instanceof Barrier3D && barrier instanceof YUKA.Vehicle);
  assert.ok(barrier.officer instanceof Police3D && barrier.officer instanceof YUKA.Vehicle);
  assert.ok(world.obstacles.includes(barrier.officer));
  const positions = world.obstacles.map(item => item.position.clone()); world.update(.1);
  assert.ok(world.obstacles.every((item, i) => item.position.equals(positions[i])));
  const frame = world.circuit.frameAt(spawn.point);
  assert.ok(frame.point.distanceTo(spawn.point) < 1e-8);
  assert.ok(Math.abs(frame.direction.dot(frame.normal)) < 1e-8);
});

test('retour au circuit : voitures créées au centre et hors de la piste rejoignent puis avancent', () => {
  const { World3D, YUKA } = scene();
  for (const origin of [[0, 0, 0], [2, 0, 3], [34, 0, 0]]) {
    const world = new World3D(() => .3), car = world.addVehicle(new YUKA.Vector3(...origin));
    let entered = false, travelAfterEntry = 0, previous = car.position.clone();
    for (let i = 0; i < 1500; i++) {
      world.update(1 / 60);
      const distance = car.position.distanceTo(world.circuit.frameAt(car.position).point);
      if (distance < 1.4) entered = true;
      if (entered) {
        travelAfterEntry += car.position.distanceTo(previous);
        assert.ok(distance < world.circuit.radius - .7, `sortie après entrée : ${distance}`);
      }
      previous.copy(car.position);
    }
    assert.ok(entered && travelAfterEntry > 25, `origine ${origin}, trajet ${travelAfterEntry}`);
    assert.equal(car.road.joining, false);
  }
});

test('maintien route : correction anticipée bornée avant une sortie, sans déplacer la voiture', () => {
  const { a, circuit, YUKA } = passingFixture();
  a.position.set(0, 0, 2.8); a.velocity.set(4, 0, 3);
  const before = a.position.clone(), velocity = a.velocity.clone();
  const force = a.road.calculate(a, new YUKA.Vector3());
  assert.ok(force.z < 0 && force.length() <= a.maxForce + 1e-10);
  assert.ok(a.position.equals(before) && a.velocity.equals(velocity));
  a.position.set(0, 0, 0); a.velocity.set(4, 0, 0);
  assert.equal(a.road.calculate(a, force).length(), 0);
});

test('retour route : point d’entrée stable, dépassement suspendu et un seul update hérité', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(() => .3);
  const car = world.addVehicle(new YUKA.Vector3(0, 0, 0));
  car.road.prepare(car); const entry = car.road.entry.clone(), before = car.position.clone();
  car.road.prepare(car); assert.ok(car.road.entry.equals(entry)); assert.ok(car.position.equals(before));
  car.overtake.prepare(car, [car], world.circuit, () => 50, 1 / 60, []);
  assert.equal(car.overtake.leader, null); assert.equal(car.follow.weight, 2);
  let updates = 0; const inherited = car.update;
  car.update = function(dt) { updates++; return inherited.call(this, dt); };
  world.update(1 / 60); assert.equal(updates, 1);
});

test('curseur du chemin : reprend devant après un waypoint raté pendant l’évitement', () => {
  const { World3D } = scene(); const world = new World3D(() => .3), car = world.addVehicle();
  car.position.copy(world.circuit.points[40]); car.velocity.copy(world.circuit.spawn(40).direction).multiplyScalar(4);
  car.follow.path._index = 0;
  const oldTarget = car.follow.path.current().clone(); car.road.prepare(car);
  assert.ok(!car.follow.path.current().equals(oldTarget));
  assert.ok(car.follow.path.current().distanceTo(car.position) < 5);
});

test('chaussée : trafic, dépassements et six barrages restent dans le circuit pendant une minute', () => {
  const { World3D } = scene(); const world = new World3D();
  for (const index of [4, 15, 26, 37, 48, 59]) {
    const spawn = world.circuit.spawn(index);
    spawn.point.add(world.circuit.frameAt(spawn.point).normal.multiplyScalar(1.6));
    world.addObstacle(spawn.point);
  }
  for (let i = 0; i < 15; i++) world.addVehicle();
  const progressPositions = world.traffic.map(car => car.position.clone());
  let maxDistance = 0, avoidance = 0, passing = 0;
  for (let i = 0; i < 3600; i++) {
    world.update(1 / 60);
    for (const [j, car] of world.traffic.entries()) {
      const distance = car.position.distanceTo(world.circuit.frameAt(car.position).point);
      maxDistance = Math.max(maxDistance, distance);
      assert.ok(distance + .7 < world.circuit.radius, `voiture ${car.agentId}, pas ${i}, distance ${distance}`);
      assert.ok(car.getSpeed() <= car.maxSpeed + 1e-8);
      for (const obstacle of world.obstacles) {
        assert.ok(car.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .7,
          `obstacle traversé : voiture ${car.agentId}, pas ${i}`);
      }
      avoidance += Number(car.avoidance.detected); passing += Number(!!car.overtake.leader);
      if (i % 300 === 299) {
        assert.ok(car.position.distanceTo(progressPositions[j]) > .4, `voiture figée ${j}, pas ${i}`);
        progressPositions[j].copy(car.position);
      }
    }
  }
  assert.ok(avoidance > 0 && passing > 0, `détections d'évitement ${avoidance}, dépassements ${passing}`);
});

test('barrière : approche frontale rapide évitée, garde-route active et progression après freinage', () => {
  const { world, a, b, YUKA } = passingFixture();
  world.traffic.splice(world.traffic.indexOf(b), 1); world.agents.splice(world.agents.indexOf(b), 1); world.manager.remove(b);
  a.velocity.set(12, 0, 0); a.maxSpeed = a.baseSpeed = 12;
  world.addObstacle(new YUKA.Vector3(10, 0, 0));
  let minimum = Infinity, intervention = false;
  for (let i = 0; i < 900; i++) {
    world.update(1 / 60);
    for (const obstacle of world.obstacles) minimum = Math.min(minimum, a.position.distanceTo(obstacle.position) - obstacle.boundingRadius);
    intervention ||= a.safety.intervening;
    assert.ok(Math.abs(a.position.z) + .7 < 4.2);
  }
  assert.ok(minimum >= .7, `distance : ${minimum}`);
  assert.ok(intervention && a.position.x > 15, `voiture bloquée : ${a.position.x}`);
});

test('création : une voiture ne naît pas à l’intérieur d’une barrière', () => {
  const { World3D } = scene(); const world = new World3D(() => .3);
  const point = world.circuit.spawn(19).point; world.addObstacle(point);
  const car = world.addVehicle(point);
  assert.ok(world.obstacles.every(obstacle => car.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .8));
});

test('sécurité : segment balayé, force bornée, aucun déplacement pendant le calcul', () => {
  const { world, a, b, YUKA } = passingFixture();
  world.addObstacle(new YUKA.Vector3(8, 0, 0));
  const before = a.position.clone(), velocity = a.velocity.clone();
  a.velocity.set(12, 0, 0); a.maxSpeed = 12;
  assert.equal(a.safety.evaluate(a, new YUKA.Vector3()), -Infinity);
  const currentVelocity = a.velocity.clone(); const force = new YUKA.Vector3();
  a.steering.calculate(1 / 60, force);
  assert.ok(force.length() <= a.maxForce + 1e-8);
  assert.ok(a.position.equals(before) && a.velocity.equals(currentVelocity));
});

test('création : refuser un nouveau barrage qui chevauche une voiture déjà présente', () => {
  const { World3D } = scene(); const world = new World3D(() => .3), car = world.addVehicle();
  assert.equal(world.addObstacle(car.position), null);
  assert.equal(world.obstacles.length, 0);
  car.velocity.copy(world.circuit.frameAt(car.position).direction).multiplyScalar(12);
  const near = car.position.clone().add(world.circuit.frameAt(car.position).direction.multiplyScalar(3.5));
  assert.equal(world.addObstacle(near), null);
  assert.equal(world.obstacles.length, 0);
});

test('reprise : une force nulle devant un barrage déclenche un contournement stable et se termine', () => {
  const { world, a, b, YUKA } = passingFixture();
  world.traffic.splice(world.traffic.indexOf(b), 1); world.agents.splice(world.agents.indexOf(b), 1); world.manager.remove(b);
  a.velocity.set(0, 0, 0); a.baseSpeed = a.maxSpeed = 2.8;
  const barrier = world.addObstacle(new YUKA.Vector3(4, 0, 0));
  // Reproduit le point d'équilibre : intention sûre mais complètement immobile.
  a.safety.intent.calculate = (dt, force) => force.set(0, 0, 0);
  let started = false, completed = false, side;
  for (let i = 0; i < 1200; i++) {
    world.update(1 / 60);
    if (a.safety.escape?.obstacle === barrier) {
      started = true;
      if (side === undefined) side = a.safety.escape.offset;
      assert.equal(a.safety.escape.offset, side);
    }
    completed ||= started && !a.safety.escape && a.position.x > 7.4;
    assert.ok(Math.abs(a.position.z) + .7 < 4.2);
    assert.ok(world.obstacles.every(obstacle => a.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .7));
  }
  assert.ok(started && completed, `restée bloquée : ${a.position.x}, ${a.position.z}`);
});

test('reprise : aucun contournement forcé sans obstacle proche, temps nul sans effet', () => {
  const { a, b, circuit } = passingFixture(); a.velocity.set(0, 0, 0);
  const before = a.position.clone();
  for (let i = 0; i < 120; i++) a.safety.updateProgress(a, 1 / 60);
  assert.equal(a.safety.escape, null);
  const time = a.safety.sampleTime; a.safety.updateProgress(a, 0);
  assert.equal(a.safety.sampleTime, time); assert.ok(a.position.equals(before));
});

test('reprise : une voiture arrêtée devant est reconnue pour le dépassement', () => {
  const { a, b, circuit } = passingFixture(); b.velocity.set(0, 0, 0);
  a.overtake.prepare(a, [a, b], circuit, () => 80, 1 / 60, []);
  assert.equal(a.overtake.leader, b);
});

test('reprise : sortir de la marge de prudence sans pénétrer dans la barrière', () => {
  const { world, a, b, YUKA } = passingFixture();
  world.traffic.splice(world.traffic.indexOf(b), 1); world.agents.splice(world.agents.indexOf(b), 1); world.manager.remove(b);
  const barrier = world.addObstacle(new YUKA.Vector3(6, 0, 0));
  a.position.set(3.61, 0, 0); a.velocity.set(0, 0, 0); a.maxSpeed = a.baseSpeed = 2.8;
  a.safety.intent.calculate = (dt, force) => force.set(0, 0, 0);
  a.safety.samplePosition.copy(a.position);
  const before = a.position.clone();
  for (let i = 0; i < 600; i++) {
    world.update(1 / 60);
    assert.ok(world.obstacles.every(obstacle => a.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .7));
  }
  assert.ok(a.position.distanceTo(before) > 3);
});

test('reprise : cas réel figé près d’une barrière sur un virage du circuit', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(() => .3);
  for (const index of [4, 15, 26, 37, 48, 59]) {
    const spawn = world.circuit.spawn(index);
    spawn.point.add(new YUKA.Vector3(spawn.direction.z * 1.6, 0, -spawn.direction.x * 1.6));
    world.addObstacle(spawn.point);
  }
  const car = world.addVehicle(); car.position.set(4.7160270986143304, 0, 17.65794808996873);
  car.velocity.set(0, 0, 0); car.maxSpeed = car.baseSpeed = 3.321466746;
  car.safety.intent.calculate = (dt, force) => force.set(0, 0, 0);
  car.safety.samplePosition.copy(car.position);
  const before = car.position.clone();
  for (let i = 0; i < 600; i++) {
    world.update(1 / 60);
    assert.ok(world.obstacles.every(obstacle => car.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .7));
    assert.ok(car.position.distanceTo(world.circuit.frameAt(car.position).point) + .7 < 4.2);
  }
  assert.ok(car.position.distanceTo(before) > 3, `distance : ${car.position.distanceTo(before)}`);
});

test('reprise : le cas oscillant devant un barrage progresse sur chaque fenêtre de cinq secondes', () => {
  const { World3D, YUKA } = scene(); const world = new World3D(() => .3);
  for (const index of [4, 15, 26, 37, 48, 59]) {
    const spawn = world.circuit.spawn(index);
    spawn.point.add(new YUKA.Vector3(spawn.direction.z * 1.6, 0, -spawn.direction.x * 1.6));
    world.addObstacle(spawn.point);
  }
  const car = world.addVehicle(); car.position.set(-22.605092604068123, 0, 13.866435039751279);
  car.velocity.set(0, 0, 0); car.maxSpeed = car.baseSpeed = 3.149806333;
  car.safety.samplePosition.copy(car.position);
  let previous = car.position.clone();
  for (let i = 0; i < 1200; i++) {
    world.update(1 / 60);
    if (i % 300 === 299) {
      assert.ok(car.position.distanceTo(previous) > .4, `oscillation : ${car.position.distanceTo(previous)}`);
      previous.copy(car.position);
    }
    assert.ok(world.obstacles.every(obstacle => car.position.distanceTo(obstacle.position) >= obstacle.boundingRadius + .7));
    assert.ok(car.position.distanceTo(world.circuit.frameAt(car.position).point) + .7 < 4.2);
  }
});
