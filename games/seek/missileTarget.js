// Cible du scénario missile : wander normal, accélération en fuite, ralentissement progressif.
class MissileTarget extends Vehicle {
  constructor(x, y, rng = Math.random, capacity = 100) {
    super(x, y);
    this.r = 15;
    this.rng = rng;
    this.cruiseSpeed = 2.2;
    this.escapeSpeed = 7.5;
    this.maxSpeed = this.escapeSpeed;
    this.maxForce = 0.22;
    this.detectionRadius = 230;
    this.releaseRadius = 340;
    this.decoyCapacity = capacity;
    this.decoysRemaining = capacity;
    this.state = 'cruising';
    this.wanderAngle = rng() * Math.PI * 2;
    this.escapeElapsed = 0;
    this.lastAlarmAt = -Infinity;
    this.vel.set(Math.cos(this.wanderAngle) * this.cruiseSpeed, Math.sin(this.wanderAngle) * this.cruiseSpeed);
  }

  configureCapacity(capacity) {
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 300) {
      throw new RangeError('Capacité attendue : entier entre 0 et 300.');
    }
    const used = this.decoyCapacity - this.decoysRemaining;
    this.decoyCapacity = capacity;
    this.decoysRemaining = Math.max(0, capacity - used);
  }

  flee(position) { return FleeBehavior.force(this, position); }

  idleForce() {
    const movement = TargetMotion.wander(this, this.wanderAngle, this.rng);
    this.wanderAngle = movement.angle;
    return movement.force;
  }

  decide(missile, elapsedSeconds, nowSeconds) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    const distance = p5.Vector.sub(missile.pos, this.pos).mag();
    const entered = this.state !== 'escaping' && distance <= this.detectionRadius;
    if (entered) {
      this.state = 'escaping';
      this.escapeElapsed = 0;
    }
    if (this.state === 'escaping' && distance >= this.releaseRadius) {
      this.state = 'cruising';
      if (this.vel.mag() > 0) this.wanderAngle = Math.atan2(this.vel.y, this.vel.x);
    }

    let force;
    if (this.state === 'escaping') {
      this.escapeElapsed += dt;
      const acceleration = Math.min(1, this.escapeElapsed / 0.65);
      this.maxSpeed = this.cruiseSpeed + (this.escapeSpeed - this.cruiseSpeed) * acceleration;
      force = this.flee(missile.pos);
    } else {
      // Le plafond reste haut : la vitesse désirée de wander ramène progressivement
      // vers cruiseSpeed au moyen d'une force, sans limitation brutale dans update().
      this.maxSpeed = this.escapeSpeed;
      force = this.idleForce();
    }
    this.applyForce(force);

    const alarm = entered && nowSeconds - this.lastAlarmAt >= 1;
    if (alarm) this.lastAlarmAt = nowSeconds;
    const releaseCount = entered ? Math.min(10, this.decoysRemaining) : 0;
    this.decoysRemaining -= releaseCount;
    return { entered, alarm, releaseCount, distance, force };
  }

  respawn(x, y) {
    this.pos.set(x, y);
    this.acc.set(0, 0);
    this.state = 'cruising';
    this.escapeElapsed = 0;
    this.maxSpeed = this.escapeSpeed;
    this.wanderAngle = this.rng() * Math.PI * 2;
    this.vel.set(Math.cos(this.wanderAngle) * this.cruiseSpeed, Math.sin(this.wanderAngle) * this.cruiseSpeed);
  }

  show(debug = false) {
    push();
    if (debug) {
      noFill();
      stroke(this.state === 'escaping' ? '#ff405d' : '#ffd95a');
      strokeWeight(1.5);
      circle(this.pos.x, this.pos.y, this.detectionRadius * 2);
    }
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    stroke('#ffffff');
    strokeWeight(2);
    fill(this.state === 'escaping' ? '#ff4f6d' : '#47d7ff');
    triangle(18, 0, -13, -10, -13, 10);
    fill('#101828');
    circle(0, 0, 8);
    pop();
  }
}
