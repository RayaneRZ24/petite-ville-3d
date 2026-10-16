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
  const context = vm.createContext({ createVector: (x, y) => new Vector(x, y),
    p5: { Vector }, width: 800, height: 600 });
  for (const file of ['vehicle.js', 'population.js', 'fleeBehavior.js', 'targetAvoidance.js', 'targetMotion.js', 'target.js', 'mouseTarget.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  return vm.runInContext('({ Vehicle, MouseTarget, avoidance: TargetAvoidance })', context);
}

test('perception : flèche la plus proche, seuil inclusif et ordre stable en cas d’égalité', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene(); const t = new MouseTarget(0, 0);
  const edge = new Vehicle(96, 0), outside = new Vehicle(96.001, 0);
  assert.equal(a.nearestVehicle(t, []), null);
  assert.equal(a.nearestVehicle(t, [outside, t]), null);
  assert.equal(a.nearestVehicle(t, [edge, outside]), edge);
  const near = new Vehicle(10, 0), tie = new Vehicle(-10, 0);
  assert.equal(a.nearestVehicle(t, [edge, near, tie]), near);
  assert.equal(a.nearestVehicle(t, [tie, near]), tie);
});

test('fuite : force opposée aux quatre directions et à la diagonale, limitée à maxForce', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  for (const [x, y] of [[40, 0], [-40, 0], [0, 40], [0, -40], [30, 40]]) {
    const t = new MouseTarget(0, 0); const threat = new Vehicle(x, y);
    t.maxForce = 0.3;
    const before = JSON.stringify([t, threat]);
    const force = a.fleeForce(t, threat);
    assert.ok(force.x * x + force.y * y < 0);
    assert.ok(Math.abs(force.mag() - t.maxForce) < 1e-12);
    assert.equal(JSON.stringify([t, threat]), before);
    if (x === 30 && y === 40) {
      assert.ok(Math.abs(force.x + 0.18) < 1e-12);
      assert.ok(Math.abs(force.y + 0.24) < 1e-12);
    }
  }
});

test('anticipation : approche rapide détectée, éloignement et passage sans contact ignorés', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(160, 0);
  threat.vel.set(-20, 0);
  const before = JSON.stringify([t, threat]);
  assert.equal(a.nearestVehicle(t, [threat]), threat);
  assert.equal(JSON.stringify([t, threat]), before);
  threat.vel.set(20, 0);
  assert.equal(a.nearestVehicle(t, [threat]), null);
  threat.vel.set(-20, 0); t.vel.set(-20, 0);
  assert.equal(a.nearestVehicle(t, [threat]), null); // Même vitesse : aucun rapprochement.
  t.vel.set(0, 0); threat.pos.set(160, 96.001);
  assert.equal(a.nearestVehicle(t, [threat]), null);
  threat.pos.set(160, 96);
  // À huit images du point tangent : hors de l'horizon de six images.
  assert.equal(a.nearestVehicle(t, [threat]), null);
  threat.pos.set(120, 96);
  assert.equal(a.nearestVehicle(t, [threat]), threat);
  threat.pos.set(1000, 0);
  assert.equal(a.nearestVehicle(t, [threat]), null);
});

test('contact : taille réelle de chaque flèche incluse dans le seuil', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(110, 0);
  threat.r = 30;
  assert.equal(a.nearestVehicle(t, [threat]), threat);
  threat.pos.x += 0.001;
  assert.equal(a.nearestVehicle(t, [threat]), null);
});

test('fuite maintenue : marge de sécurité avant de rendre la priorité au freinage', () => {
  const { Vehicle, MouseTarget } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(96, 0);
  t.applyAvoidance([threat]);
  assert.equal(t.isFleeing, true);
  t.acc.set(0, 0); threat.pos.set(128, 0);
  assert.ok(t.applyAvoidance([threat]).x < 0);
  assert.equal(t.isFleeing, true);
  t.acc.set(0, 0); threat.pos.set(128.001, 0);
  assert.equal(t.applyAvoidance([threat]).mag(), 0);
  assert.equal(t.isFleeing, false);
  threat.pos.set(110, 0);
  t.applyAvoidance([threat]);
  assert.equal(t.isFleeing, false); // La marge ne déclenche pas une nouvelle fuite.
});

test('fuite : vitesse désirée moins vitesse actuelle, dont freinage au-dessus de maxSpeed', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0); const threat = new Vehicle(-20, 0);
  t.maxSpeed = 10; t.maxForce = 100; t.vel.set(2, 3);
  const force = a.fleeForce(t, threat);
  assert.deepEqual([force.x, force.y], [8, -3]);
  t.vel.set(20, 0); t.maxForce = 0.3;
  assert.ok(Math.abs(a.fleeForce(t, threat).x + 0.3) < 1e-12);
  t.maxForce = 0; assert.equal(a.fleeForce(t, threat).mag(), 0);
});

test('fuite : positions confondues, direction du poursuivant et repli déterministe', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(10, 10), threat = new Vehicle(10, 10);
  threat.vel.set(0, -4);
  let force = a.fleeForce(t, threat);
  assert.equal(force.x, 0); assert.ok(force.y < 0);
  threat.vel.set(0, 0);
  force = a.fleeForce(t, threat);
  assert.ok(force.x > 0); assert.equal(force.y, 0);
  t.vel.set(0, 2);
  force = a.fleeForce(t, threat);
  assert.equal(force.x, 0); assert.ok(force.y > 0);
  assert.ok(Number.isFinite(force.mag()));
});

test('composition : priorité à la fuite, force appliquée et déplacement par Vehicle.update', () => {
  const { Vehicle, MouseTarget } = scene();
  const t = new MouseTarget(400, 300), threat = new Vehicle(440, 300);
  const before = [t.pos.x, t.pos.y];
  const force = t.applyAvoidance([threat, new Vehicle(340, 300)]);
  assert.equal(t.isFleeing, true); assert.ok(force.x < 0);
  assert.deepEqual([t.pos.x, t.pos.y], before);
  assert.ok(Math.abs(t.acc.mag() - t.maxForce) < 1e-12);
  assert.equal(t.update, Vehicle.prototype.update);
  t.update();
  assert.ok(t.pos.x < before[0]); assert.equal(t.pos.y, before[1]);
  assert.equal(t.acc.mag(), 0); assert.ok(t.vel.mag() <= t.maxSpeed);
});

test('sécurité : freinage borné puis arrêt, placement refusé pendant la fuite', () => {
  const { Vehicle, MouseTarget } = scene();
  const t = new MouseTarget(400, 300), threat = new Vehicle(440, 300);
  t.applyAvoidance([threat]); t.update();
  const before = JSON.stringify(t);
  assert.equal(t.placeFromPointer(100, 100), false);
  assert.equal(JSON.stringify(t), before);
  t.vel.set(3, 1);
  for (let i = 0; i < 80; i++) {
    const speed = t.vel.mag();
    const force = t.applyAvoidance([]);
    assert.ok(force.mag() <= t.maxForce + 1e-12);
    t.update(); assert.ok(t.vel.mag() <= speed + 1e-12);
  }
  assert.ok(t.vel.mag() < 1e-12); assert.equal(t.isFleeing, false);
  assert.equal(t.placeFromPointer(100, 100), true);
  assert.deepEqual([t.pos.x, t.pos.y], [100, 100]);
  assert.equal(t.vel.mag(), 0); assert.equal(t.acc.mag(), 0);
});

test('bords : la cible réutilise edges sans perte de vitesse', () => {
  const { MouseTarget } = scene();
  const t = new MouseTarget(817, 617); t.vel.set(2, 1);
  t.edges();
  assert.deepEqual([t.pos.x, t.pos.y], [-16, -16]);
  assert.deepEqual([t.vel.x, t.vel.y], [2, 1]);
});

test('fluidité : accélération graduelle et virage lissé, sans modifier les vecteurs reçus', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(96, 0);
  let previous = new Vector();
  let previousMagnitude = 0;
  for (let frame = 0; frame < 8; frame++) {
    const before = JSON.stringify([t, threat, previous]);
    const force = a.smoothFleeForce(t, threat, previous);
    assert.equal(JSON.stringify([t, threat, previous]), before);
    assert.ok(force.x < 0); assert.equal(force.y, 0);
    assert.ok(force.mag() > previousMagnitude);
    assert.ok(force.mag() - previousMagnitude <= t.maxForce * 0.25 + 1e-12);
    assert.ok(force.mag() < t.maxForce);
    previous = force; previousMagnitude = force.mag();
  }
  threat.pos.set(0, 96);
  previous.set(-t.maxForce, 0);
  const turn = a.smoothFleeForce(t, threat, previous);
  assert.deepEqual([turn.x, turn.y], [-3.375, -1.125]);
  assert.ok(turn.mag() <= t.maxForce);
});

test('fluidité : urgence prioritaire sur le lissage, force bornée même après un changement de réglage', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(96, 0);
  const previous = new Vector(t.maxForce, 0); // Ancienne direction devenue dangereuse.
  threat.pos.set(80, 0);
  const intermediate = a.smoothFleeForce(t, threat, previous);
  assert.ok(intermediate.x < 0);
  threat.pos.set(64, 0);
  const urgent = a.smoothFleeForce(t, threat, previous);
  assert.equal(urgent.x, -t.maxForce); assert.equal(urgent.y, 0);
  assert.ok(urgent.mag() > intermediate.mag());
  threat.pos.set(96, 0); t.maxForce = 0.1;
  assert.ok(a.smoothFleeForce(t, threat, previous).mag() <= t.maxForce + 1e-12);
  t.maxForce = 0;
  assert.equal(a.smoothFleeForce(t, threat, previous).mag(), 0);
});

test('fluidité : menace stable malgré de petites variations, priorité au danger réel et aux flèches restantes', () => {
  const { Vehicle, MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(0, 0), first = new Vehicle(90, 0), other = new Vehicle(-89, 0);
  t.threat = first;
  for (const x of [-89, -91, -88, -90]) {
    other.pos.set(x, 0);
    assert.equal(a.nearestVehicle(t, [other, first]), first);
  }
  other.pos.set(-77, 0);
  assert.equal(a.nearestVehicle(t, [first, other]), other);
  first.pos.set(70, 0); other.pos.set(-64, 0);
  assert.equal(a.nearestVehicle(t, [first, other]), other); // Urgence même à moins de 12 px d'écart.
  other.pos.set(-89, 0);
  assert.equal(a.nearestVehicle(t, [other]), other); // Ancienne menace supprimée.
  first.pos.set(300, 0);
  assert.equal(a.nearestVehicle(t, [first, other]), other);
  assert.equal(a.nearestVehicle(t, []), null);
});

test('fluidité : freinage proportionnel, borné, sans inversion de vitesse ni déplacement direct', () => {
  const { MouseTarget, avoidance: a } = scene();
  const t = new MouseTarget(10, 20); t.vel.set(10, 0);
  const before = JSON.stringify(t);
  const force = a.brakeForce(t);
  assert.equal(force.x, -1.2); assert.equal(force.y, 0);
  assert.equal(JSON.stringify(t), before);
  t.applyForce(force); t.update();
  assert.equal(t.vel.x, 8.8);
  t.maxForce = 0.1;
  assert.ok(a.brakeForce(t).mag() <= 0.1 + 1e-12);
  t.vel.set(0.01, -0.01);
  t.applyForce(a.brakeForce(t)); t.update();
  assert.equal(t.vel.mag(), 0);
  assert.equal(a.brakeForce(t).mag(), 0);
});

test('fluidité : mémoire de fuite réinitialisée au freinage et au placement par la souris', () => {
  const { Vehicle, MouseTarget } = scene();
  const t = new MouseTarget(0, 0), threat = new Vehicle(96, 0);
  const firstForce = t.applyAvoidance([threat]);
  assert.deepEqual([t.previousForce.x, t.previousForce.y], [firstForce.x, firstForce.y]);
  t.update();
  const speed = t.vel.mag();
  const braking = t.applyAvoidance([]);
  assert.ok(braking.x > 0); assert.ok(braking.mag() < speed);
  assert.equal(t.previousForce.mag(), 0); assert.equal(t.threat, null);
  t.previousForce.set(2, 3);
  assert.equal(t.placeFromPointer(200, 100), true);
  assert.equal(t.previousForce.mag(), 0); assert.equal(t.vel.mag(), 0);
  assert.equal(t.acc.mag(), 0);
});
