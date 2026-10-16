// Missile guidé : la sélection de la signature est faite par le contrôleur.
class Missile extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.r = 13;
    this.maxSpeed = 9;
    this.maxForce = 0.32;
    this.lockedSignal = null;
  }

  pursue(signal) {
    if (!signal) return createVector(0, 0);
    const prediction = Math.min(24, p5.Vector.sub(signal.pos, this.pos).mag() / Math.max(1, this.maxSpeed));
    const future = createVector(signal.pos.x + signal.vel.x * prediction, signal.pos.y + signal.vel.y * prediction);
    return this.seek(future);
  }

  applyGuidance(signal) {
    const force = this.pursue(signal);
    this.applyForce(force);
    this.lockedSignal = signal;
    return force;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    stroke('#ffffff');
    strokeWeight(2);
    fill('#ff334f');
    triangle(this.r, 0, -this.r, -7, -this.r, 7);
    noStroke();
    fill('#ffb020');
    triangle(-this.r, -5, -this.r - 13 - Math.random() * 5, 0, -this.r, 5);
    pop();
  }
}
