class SnakeRing extends Vehicle {
  constructor(x, y, maxSpeed = 7.2, maxForce = 2.4) {
    super(x, y, maxSpeed, maxForce);
    this.r = 10;
    this.rayonZoneDeFreinage = 10;
  }

  arrive(position, brakingRadius = this.rayonZoneDeFreinage, leaderVelocity = createVector(0, 0)) {
    return SnakeArrival.force(this, position, brakingRadius, leaderVelocity);
  }
}
