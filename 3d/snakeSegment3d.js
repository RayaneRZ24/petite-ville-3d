class SnakeSegment3D extends YUKA.Vehicle {
  constructor(leader, spacing, obstacles = []) {
    super();
    const direction = leader.velocity.clone().normalize();
    this.position.copy(leader.position).sub(direction.multiplyScalar(spacing));
    this.velocity.copy(leader.velocity);
    this.rotation.copy(leader.rotation);
    this.maxSpeed = 10;
    this.maxForce = 30;
    this.boundingRadius = .5;
    this.neighborhoodRadius = 2.4;
    this.follow = new ChainFollow3D(leader, spacing);
    this.follow.weight = 5;
    this.separation = new LocalSeparation3D();
    this.composition = new WeightedSteering3D([this.follow, this.separation]);
    this.avoidance = new TeacherAvoidance3D(obstacles);
    this.steering.add(this.avoidance);
    this.steering.add(this.composition);
  }
}
