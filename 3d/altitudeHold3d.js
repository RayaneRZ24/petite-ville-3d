class AltitudeHold3D extends YUKA.SteeringBehavior {
  constructor(height) { super(); this.height = height; this.weight = 2; }
  calculate(vehicle, force) {
    const desiredY = Math.max(-vehicle.maxSpeed, Math.min(vehicle.maxSpeed, (this.height - vehicle.position.y) * 4));
    return force.set(0, Math.max(-vehicle.maxForce, Math.min(vehicle.maxForce, (desiredY - vehicle.velocity.y) * 4)), 0);
  }
}
