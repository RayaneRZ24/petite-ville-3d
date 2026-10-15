class FlockDrone3D extends YUKA.Vehicle {
  constructor(position, direction, path, groupId, weights) {
    super();
    this.position.copy(position);
    this.velocity.copy(direction).multiplyScalar(4.5);
    this.maxSpeed = 5.5;
    this.maxForce = 12;
    this.boundingRadius = .25;
    this.perceptionRadius = 3.5;
    this.groupId = groupId;
    this.flockNeighbors = [];
    this.spacingNeighbors = [];
    this.groupCenter = position.clone();
    this.lookAt(position.clone().add(direction));
    this.align = new FlockingRule3D('align');
    this.cohesion = new FlockingRule3D('cohesion');
    this.separation = new FlockingRule3D('separation');
    this.follow = new YUKA.FollowPathBehavior(path, 3);
    this.follow.weight = .6;
    this.onPath = new YUKA.OnPathBehavior(path, 3, .5);
    this.onPath.weight = .4;
    this.altitude = new AltitudeHold3D(5.5);
    this.regroup = new YUKA.ArriveBehavior(this.groupCenter, .5);
    this.regroup.active = false;
    this.composition = new WeightedSteering3D([this.align, this.cohesion, this.separation, this.follow, this.onPath, this.regroup]);
    this.steering.add(this.altitude);
    this.steering.add(this.composition);
    this.setFlockWeights(weights);
  }

  setFlockWeights(weights) {
    this.align.weight = weights.align;
    this.cohesion.weight = weights.cohesion;
    this.regroup.weight = weights.cohesion * 1.2;
    this.separation.weight = weights.separation;
  }
}
