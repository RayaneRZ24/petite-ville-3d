// Somme pondérée de vrais comportements Yuka, puis limitation du budget de force.
class WeightedSteering3D extends YUKA.SteeringBehavior {
  constructor(behaviors) {
    super();
    this.behaviors = behaviors;
    this.result = new YUKA.Vector3();
  }

  calculate(vehicle, force, delta) {
    for (const behavior of this.behaviors) {
      if (!behavior.active || behavior.weight === 0) continue;
      this.result.set(0, 0, 0);
      behavior.calculate(vehicle, this.result, delta);
      force.add(this.result.multiplyScalar(behavior.weight));
    }
    const length = force.length();
    if (length > vehicle.maxForce) force.multiplyScalar(vehicle.maxForce / length);
    return force;
  }
}
