// Effet visible d'une collision ; entité conforme au modèle Vehicle, sans steering.
class Explosion extends Vehicle {
  constructor(x, y, durationSeconds = 0.7) {
    super(x, y);
    this.r = 2;
    this.durationSeconds = durationSeconds;
    this.ageSeconds = 0;
  }

  advance(elapsedSeconds) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this.ageSeconds += dt;
    return this.ageSeconds >= this.durationSeconds;
  }

  show() {
    const progress = Math.min(1, this.ageSeconds / this.durationSeconds);
    push();
    noFill();
    stroke(`rgba(255, ${Math.round(190 - 120 * progress)}, 40, ${1 - progress})`);
    strokeWeight(5 * (1 - progress) + 1);
    circle(this.pos.x, this.pos.y, 12 + 90 * progress);
    stroke('#ffffff');
    strokeWeight(1);
    circle(this.pos.x, this.pos.y, 7 + 45 * progress);
    pop();
  }
}
