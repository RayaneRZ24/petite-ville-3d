// Un bus rigide réutilise le pilotage et la sécurité du trafic existant.
class Bus3D extends TrafficVehicle3D {
  constructor(spawn, path, speed, obstacles, circuit) {
    super(spawn, path, 3.6, obstacles, circuit);
    this.isBus = true;
    this.collisionRadius=1.16;
    this.boundingRadius = 1.1;
    this.maxForce = 16;
    this.neighborhoodRadius = 3.5;
    this.wander = new YUKA.WanderBehavior(.6, 3, 1.5);
    this.service = new BusService3D();
    this.safety.intent.behaviors.splice(2, 0, this.service);
    this.composition.behaviors.push(this.wander);
    this.setWeights(2, 2.5, .5);
  }

  setWeights(follow, separation, wander) {
    if (![follow, separation, wander].every(value => Number.isFinite(value) && value >= 0 && value <= 5)) throw new RangeError('Poids du bus invalides.');
    this.weights = { follow, separation, wander };
    this.followWeight = this.onPathWeight = follow;
    this.follow.weight = this.onPath.weight = follow;
    this.separation.weight = separation * 12;
    this.wander.weight = wander;
  }
}
