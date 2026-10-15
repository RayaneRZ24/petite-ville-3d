class TrafficVehicle3D extends YUKA.Vehicle {
  constructor(spawn, path, speed = 4.3, obstacles = [], circuit = null) {
    super();
    this.steering=new TrafficSteering3D(this);
    this.collisionRadius=.7;
    this.position.copy(spawn.point);
    this.velocity.copy(spawn.direction).multiplyScalar(speed);
    this.maxSpeed = speed;
    this.baseSpeed = speed;
    this.maxForce = 15;
    this.boundingRadius = this.collisionRadius;
    this.neighborhoodRadius = 2.4;
    this.lookAt(spawn.point.clone().add(spawn.direction));
    this.follow = new YUKA.FollowPathBehavior(path, 2.1);
    this.follow.weight = 2;
    this.onPath = new YUKA.OnPathBehavior(path, 1.2, .5);
    this.onPath.weight = 2;
    this.separation = new LocalSeparation3D();
    this.separation.weight = 14;
    this.avoidance = new TeacherAvoidance3D(obstacles);
    this.overtake = new Overtake3D();
    if (circuit) {
      this.road = new RoadContainment3D(circuit);
    }
    const composition = this.composition = new WeightedSteering3D([this.follow, this.onPath, this.separation, this.overtake]);
    if (circuit) {
      this.safety = new CollisionSafety3D(this, circuit, obstacles, [this.road, this.avoidance, composition]);
      this.steering.add(this.safety);
    } else {
      this.steering.add(this.avoidance);
      this.steering.add(composition);
    }
  }
}
