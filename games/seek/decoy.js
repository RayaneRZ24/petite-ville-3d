// Signature temporaire que le missile peut poursuivre à la place d'une vraie cible.
class Decoy extends Vehicle {
  constructor(x, y, velocity, lifetimeSeconds = 2) {
    super(x, y);
    this.r = 7;
    this.maxSpeed = Math.max(1, velocity.mag());
    this.maxForce = 0;
    this.vel.set(velocity.x, velocity.y);
    this.lifetimeSeconds = lifetimeSeconds;
    this.ageSeconds = 0;
  }

  advance(elapsedSeconds) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    super.update();
    super.edges();
    this.ageSeconds += dt;
    return this.ageSeconds >= this.lifetimeSeconds;
  }

  show() {
    const ratio = Math.max(0, 1 - this.ageSeconds / this.lifetimeSeconds);
    push();
    noStroke();
    fill(`rgba(255, 224, 74, ${ratio})`);
    circle(this.pos.x, this.pos.y, 14 + Math.sin(this.ageSeconds * 24) * 4);
    stroke(`rgba(255, 103, 31, ${ratio})`);
    strokeWeight(2);
    line(this.pos.x, this.pos.y, this.pos.x - this.vel.x * 5, this.pos.y - this.vel.y * 5);
    pop();
  }
}
