// TargetFuyante hérite de flee(), update() et edges() via Target puis Vehicle.
class TargetFuyante extends Target {
  constructor(x, y, rng = Math.random) {
    super(x, y, rng);
    this.detectionRadius = 200;
    this.maxFleeSeconds = 3;
    this.staminaSeconds = this.maxFleeSeconds;
    this.fleeSpeed = this.maxSpeed;
    this.state = 'normal';
    this.fleeElapsed = 0;
    this.threatInside = false;
  }

  resetMotion() {
    super.resetMotion();
    this.staminaSeconds = this.maxFleeSeconds ?? 3;
    this.state = 'normal';
    this.fleeElapsed = 0;
    this.threatInside = false;
    this.duplicationPending = false;
  }

  onCaptured() {
    // Une capture interrompt la série de survie, même si le vaisseau réapparaît.
    this.duplicationPending = false;
    this.fleeElapsed = 0;
    this.staminaSeconds = 0;
    this.stopFleeing(true);
  }

  configure(radius, duration) {
    if (!Number.isFinite(radius) || radius < 50 || radius > 290
      || !Number.isFinite(duration) || duration < 0.5 || duration > 10) {
      throw new RangeError('Rayon attendu : 50–290 px ; endurance : 0.5–10 s.');
    }
    const consumed = this.maxFleeSeconds - this.staminaSeconds;
    this.detectionRadius = radius;
    this.maxFleeSeconds = duration;
    this.staminaSeconds = Math.max(0, duration - consumed);
    if (this.staminaSeconds <= 1e-9 && this.state !== 'fleeing') this.state = 'recovering';
  }

  stopFleeing(exhausted) {
    if (this.vel.mag() > 0) this.wanderAngle = Math.atan2(this.vel.y, this.vel.x);
    this.state = exhausted ? 'recovering' : 'normal';
    this.isFleeing = false;
    this.threat = null;
    this.previousForce.set(0, 0);
    this.maxSpeed = this.fleeSpeed;
  }

  applyAvoidance(vehicles, elapsedSeconds = 1 / 60) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    const nearest = FleeingTargetBehavior.nearest(this, vehicles);
    this.threatInside = nearest.distance <= this.detectionRadius;
    // Une fuite reste active dans la couronne située entre détection et 300 px.
    if (this.state === 'fleeing' && nearest.distance >= FleeingTargetBehavior.ESCAPE_DISTANCE) {
      this.stopFleeing(false);
    }
    if (this.state === 'recovering') {
      this.staminaSeconds = Math.min(this.maxFleeSeconds, this.staminaSeconds + dt);
      if (this.staminaSeconds >= this.maxFleeSeconds - 1e-9) this.state = 'normal';
      // La recharge ne compte jamais comme du temps de fuite dans cette image.
    } else if (this.state === 'normal' && this.threatInside && this.staminaSeconds > 1e-9) {
      this.state = 'fleeing';
      this.fleeElapsed = 0;
    } else if (this.state === 'normal') {
      this.staminaSeconds = Math.min(this.maxFleeSeconds, this.staminaSeconds + dt);
    }

    let force;
    if (this.state === 'fleeing') {
      this.fleeElapsed += Math.min(dt, this.staminaSeconds);
      this.staminaSeconds = Math.max(0, this.staminaSeconds - dt);
      if (this.staminaSeconds <= 1e-9) {
        // Un seul événement à la fin d'une fuite continue réussie.
        this.duplicationPending = this.fleeElapsed >= this.maxFleeSeconds - 1e-9;
        this.staminaSeconds = 0;
        this.stopFleeing(true);
        force = this.idleForce();
      } else {
        this.isFleeing = true;
        this.threat = nearest.vehicle;
        this.maxSpeed = FleeingTargetBehavior.boostSpeed(this, this.fleeElapsed);
        const inheritedForce = this.flee(this.threat.pos);
        force = TargetAvoidance.smoothFleeForce(this, this.threat, this.previousForce, inheritedForce);
        this.previousForce.set(force.x, force.y);
      }
    } else {
      this.isFleeing = false;
      this.maxSpeed = this.fleeSpeed;
      force = this.idleForce();
    }
    this.applyForce(force);
    return force;
  }

  show(debug = false, vehicles) {
    {
      // Le rendu utilise les positions après locomotion, sans modifier la décision.
      const inside = vehicles
        ? FleeingTargetBehavior.nearest(this, vehicles, this.detectionRadius).vehicle !== null
        : this.threatInside;
      push();
      noFill();
      stroke(inside ? '#ff4040' : '#ffd84d');
      strokeWeight(2);
      circle(this.pos.x, this.pos.y, this.detectionRadius * 2);
      pop();
    }
    if (debug) {
      push();
      noFill();
      stroke('#ffffff88');
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, FleeingTargetBehavior.ESCAPE_DISTANCE * 2);
      pop();
    }
    super.show(false);
    const ratio = Math.max(0, Math.min(1, this.staminaSeconds / this.maxFleeSeconds));
    push();
    stroke('#ffffff');
    strokeWeight(1);
    fill('#18202c');
    rect(this.pos.x - 25, this.pos.y - 30, 50, 6, 2);
    noStroke();
    fill(this.state === 'recovering' ? '#ffb347' : '#63e6be');
    rect(this.pos.x - 24, this.pos.y - 29, 48 * ratio, 4, 1);
    pop();
  }
}
