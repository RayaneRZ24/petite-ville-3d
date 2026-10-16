// Cible rouge : placement par la souris et fuite autonome en cas de proximité.
class MouseTarget extends Target {
  constructor(x, y) {
    super(x, y);
    this.vel.set(0, 0);
  }

  placeFromPointer(x, y) {
    if (this.isFleeing) return false;
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.acc.set(0, 0);
    this.previousForce.set(0, 0);
    this.threat = null;
    return true;
  }

  idleForce() {
    return TargetAvoidance.brakeForce(this);
  }
}
