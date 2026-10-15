class SnakeHead3D extends YUKA.Vehicle {
  constructor(position, direction, path, obstacles = []) {
    super();
    this.position.copy(position);
    this.velocity.copy(direction).multiplyScalar(6.5);
    this.maxSpeed = 6.5;
    this.maxForce = 18;
    this.boundingRadius = .7;
    this.neighborhoodRadius = 3;
    this.lookAt(position.clone().add(direction));
    this.follow = new YUKA.FollowPathBehavior(path, 2.3);
    this.onPath = new YUKA.OnPathBehavior(path, 1.2, .5);
    this.wander = new YUKA.WanderBehavior(1.5, 4, 5);
    this.separation = new LocalSeparation3D();
    this.composition = new WeightedSteering3D([this.follow, this.onPath, this.wander, this.separation]);
    this.avoidance = new TeacherAvoidance3D(obstacles);
    this.steering.add(this.avoidance);
    this.steering.add(this.composition);
  }

  setWeights(follow, separation, wander) {
    this.follow.weight = follow;
    this.onPath.weight = follow;
    this.separation.weight = separation * 12;
    this.wander.weight = wander;
  }
}
