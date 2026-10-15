class Barrier3D extends Obstacle3D {
  constructor(position, radius, direction) {
    super(position, radius);
    this.lookAt(position.clone().add(direction));
  }
}
