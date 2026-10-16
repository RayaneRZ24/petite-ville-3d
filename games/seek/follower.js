// Réutilise seek et la locomotion fournis ; corrige flee dans une sous-classe.
class Follower extends Vehicle {
  constructor(x, y) {
    super(x, y);
    this.behavior = 'seek';
    this.xp = 0;
    this.captures = 0;
    this.baseRadius = this.r;
    this.desiredRadius = this.r;
    this.captureFlash = 0;
  }

  gainExperience() {
    this.captures++;
    this.xp += 10;
    // Croissance continue, avec des gains moins grands aux niveaux élevés.
    this.desiredRadius = this.baseRadius + 5 * Math.log2(1 + this.captures);
    this.captureFlash = 1;
  }

  animate(elapsedSeconds) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this.r += (this.desiredRadius - this.r) * (1 - Math.exp(-8 * dt));
    this.captureFlash = Math.max(0, this.captureFlash - dt);
  }

  show() {
    super.show();
    if (!this.xp) return;
    push();
    noStroke();
    fill('#ffffff');
    textAlign(CENTER);
    textSize(11);
    text(`${this.xp} XP`, this.pos.x, this.pos.y - this.r - 9);
    if (this.captureFlash > 0) {
      fill(`rgba(255, 239, 155, ${this.captureFlash})`);
      text('+10 XP', this.pos.x, this.pos.y - this.r - 24 - (1 - this.captureFlash) * 20);
    }
    pop();
  }

  flee(position) {
    return FleeBehavior.force(this, position);
  }

  applyBehaviors(position) {
    if (this.behavior === 'flee') this.applyForce(this.flee(position));
    else super.applyBehaviors(position);
  }
}
