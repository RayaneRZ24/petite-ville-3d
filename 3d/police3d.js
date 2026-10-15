class Police3D extends YUKA.Vehicle {
  constructor(position, direction) {
    super();
    this.position.copy(position);
    this.boundingRadius = .35;
    this.maxSpeed = this.maxForce = 0;
    this.lookAt(position.clone().add(direction));
  }
}
