// Arrival vers un point derrière le prédécesseur, avec sa vitesse en anticipation.
class ChainFollow3D extends YUKA.ArriveBehavior {
  constructor(leader, spacing) {
    super(new YUKA.Vector3(), .18, 0);
    this.leader = leader;
    this.spacing = spacing;
  }

  calculate(vehicle, force, delta) {
    this.target.set(0, 0, -this.spacing).applyMatrix4(this.leader.worldMatrix);
    super.calculate(vehicle, force, delta);
    force.add(this.leader.velocity);
    return force;
  }
}
