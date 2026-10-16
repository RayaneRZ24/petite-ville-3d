// Cible autonome ; fuite prioritaire sur wander, locomotion fournie inchangée.
class Target extends Vehicle {
  constructor(x, y, rng = Math.random) {
    super(x, y);
    this.r = SeekPopulation.ARRIVAL_RADIUS;
    this.detectionRadius = TargetAvoidance.DETECTION_RADIUS;
    this.isFleeing = false;
    this.threat = null;
    this.previousForce = createVector(0, 0);
    this.maxSpeed = 16;
    this.maxForce = 4.5;
    this.cruiseSpeed = 3;
    this.protected = true;
    this.rng = rng;
    this.birthAge = 0.7;
    this.splitAge = 0.7;
    this.resetMotion();
  }

  animate(elapsedSeconds) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this.birthAge = Math.min(0.7, this.birthAge + dt);
    this.splitAge = Math.min(0.7, this.splitAge + dt);
  }

  resetMotion() {
    this.wanderAngle = this.rng() * Math.PI * 2;
    const speed = Math.min(this.cruiseSpeed, this.maxSpeed);
    this.vel.set(Math.cos(this.wanderAngle) * speed, Math.sin(this.wanderAngle) * speed);
    this.acc.set(0, 0);
    this.previousForce.set(0, 0);
    this.threat = null;
    this.isFleeing = false;
  }

  idleForce() {
    const movement = TargetMotion.wander(this, this.wanderAngle, this.rng);
    this.wanderAngle = movement.angle;
    return movement.force;
  }

  // Correction héritée par les cibles spécialisées, sans toucher au Vehicle fourni.
  flee(position) {
    return FleeBehavior.force(this, position);
  }

  applyAvoidance(vehicles) {
    const threat = this.protected ? TargetAvoidance.nearestVehicle(this, vehicles) : null;
    // Reprendre l'errance dans la direction actuelle après une fuite.
    if (this.isFleeing && this.vel.mag() > 0) this.wanderAngle = Math.atan2(this.vel.y, this.vel.x);
    this.threat = threat;
    this.isFleeing = threat !== null;
    const force = threat
      ? TargetAvoidance.smoothFleeForce(this, threat, this.previousForce)
      : this.idleForce();
    this.previousForce.set(threat ? force.x : 0, threat ? force.y : 0);
    this.applyForce(force);
    return force;
  }

  show(debug = false) {
    const progress = Math.min(1, this.birthAge / 0.7);
    const size = 0.15 + 0.85 * (1 - (1 - progress) ** 3);
    push();
    noFill();
    stroke('#ffffff');
    strokeWeight(1.5);
    if (debug) circle(this.pos.x, this.pos.y, this.detectionRadius * 2);
    // Halo blanc permanent, distinct du cercle de perception.
    circle(this.pos.x, this.pos.y, 50 * size);
    if (this.splitAge < 0.7) {
      const pulse = this.splitAge / 0.7;
      stroke(`rgba(255, 255, 255, ${1 - pulse})`);
      circle(this.pos.x, this.pos.y, 50 + 90 * pulse);
      stroke('#ffffff');
    }
    fill('#ff3030');
    strokeWeight(2);
    circle(this.pos.x, this.pos.y, 28 * size);
    pop();
  }
}
