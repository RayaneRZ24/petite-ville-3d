class Obstacle3D extends YUKA.Vehicle {
  constructor(position, radius) {
    super();
    this.position.copy(position);
    this.boundingRadius = radius;
    this.maxSpeed = 0;
    this.maxForce = 0;
  }
}
