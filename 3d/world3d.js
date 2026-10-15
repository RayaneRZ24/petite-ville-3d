class World3D {
  constructor(rng = Math.random, circuit = new Circuit3D()) {
    this.rng = rng;
    this.circuit = circuit;
    this.city = circuit.city || null;
    this.mission = this.city ? new BusMission3D(this, this.city) : null;
    this.manager = new YUKA.EntityManager();
    this.snakes = [];
    this.buses = [];
    this.traffic = [];
    this.agents = [];
    this.obstacles = [];
    this.barriers = [];
    this.police = [];
    this.boids = [];
    this.nextFlockId = 0;
    this.flockWeights = { align: 1.5, cohesion: 1, separation: 3 };
    // Référence des tests sans caméra : 20 px/unité. Le rendu fournit la projection réelle.
    this.trafficDistancePixels = (a, b) => a.position.distanceTo(b.position) * 20;
    this.nextAgentId = 0;
    this.weights = { follow: 2, separation: 2.5, wander: .5 };
    this.accumulator = 0;
    this.contacts=new TrafficContacts3D();
    this.people=[];
    this.incident=this.city?new CityIncident3D(this):null;
  }

  register(agent) {
    if(this.city)agent.solidBodies=this.city.solids.bodies;
    agent.agentId = this.nextAgentId++;
    this.agents.push(agent);
    this.manager.add(agent);
  }

  addSnake() {
    const index = Math.floor(this.rng() * this.circuit.points.length) % this.circuit.points.length;
    const snake = new Snake3D(this.circuit.spawn(index), this.circuit.createPath(index), this.snakes.length, this.obstacles);
    snake.setWeights(this.weights.follow, this.weights.separation, this.weights.wander);
    this.snakes.push(snake);
    for (const segment of snake.anneaux) this.register(segment);
    return snake;
  }

  addBus() {
    const bus = this.addVehicle(null, Bus3D);
    bus.setWeights(this.weights.follow, this.weights.separation, this.weights.wander);
    bus.routeNumber = this.buses.length + 1;
    this.buses.push(bus);
    return bus;
  }

  addVehicle(position = null, VehicleType = TrafficVehicle3D) {
    const circuit = this.city && VehicleType !== Bus3D && !position ? this.city.routes[Math.floor(this.rng()*this.city.routes.length)] : this.circuit;
    let index = Math.floor(this.rng() * circuit.points.length) % circuit.points.length;
    if (position) {
      index = this.circuit.points.reduce((best, point, i, points) =>
        point.squaredDistanceTo(position) < points[best].squaredDistanceTo(position) ? i : best, 0);
    }
    const spawn = circuit.spawn(index);
    if (position) spawn.point.copy(position);
    const collisionRadius=VehicleType===Bus3D?1.16:.7;
    // Ne pas créer une voiture déjà à l'intérieur d'une barrière.
    const clearance = VehicleType === Bus3D ? 1.45 : 1.1;
    if (this.obstacles.some(item => spawn.point.distanceTo(item.position) < item.boundingRadius + clearance)) {
      const frame = this.circuit.frameAt(spawn.point);
      let free = null;
      for (const along of [0, -3, 3, -6, 6]) {
        for (const offset of [-2.3, 0, 2.3]) {
          const candidate = frame.point.clone().add(frame.direction.clone().multiplyScalar(along))
            .add(frame.normal.clone().multiplyScalar(offset));
          if (!this.obstacles.some(item => candidate.distanceTo(item.position) < item.boundingRadius + clearance)) { free = candidate; break; }
        }
        if (free) break;
      }
      if (free) spawn.point.copy(free);
    }
    const valid=point=>(!this.city||this.city.solids.free(point,collisionRadius))&&TrafficContacts3D.canSpawn(point,collisionRadius,[...this.traffic,...this.people])
      && !this.obstacles.some(item=>point.distanceTo(item.position)<item.boundingRadius+clearance);
    if(!valid(spawn.point)){
      let free=null;
      for(let step=0;step<circuit.points.length&&!free;step++)for(const offset of [0,-1.8,1.8]){
        const trial=circuit.spawn((index+step)%circuit.points.length),frame=circuit.frameAt(trial.point);
        const point=trial.point.clone().add(frame.normal.multiplyScalar(offset));
        if(valid(point)){free={point,index:trial.index,direction:trial.direction};break;}
      }
      if(!free)throw new RangeError('Aucune place libre pour ajouter un véhicule.');
      spawn.point.copy(free.point);spawn.direction.copy(free.direction);index=free.index;
    }
    const vehicle = new VehicleType(spawn, circuit.createPath(index), 2.8 + this.rng() * 5, this.obstacles, circuit);
    // Départ arrêté : accélérer par steering, sans vitesse initiale dangereuse près d'un barrage.
    vehicle.velocity.set(0, 0, 0);
    this.traffic.push(vehicle);
    this.register(vehicle);
    return vehicle;
  }

  addObstacle(position, radius = 1.4) {
    if (!Number.isFinite(radius) || radius <= 0 || ![position.x, position.y, position.z].every(Number.isFinite)) {
      throw new RangeError('Un obstacle doit avoir une position finie et un rayon positif.');
    }
    const frame = this.circuit.frameAt(position);
    // Refuser une création qui ferait apparaître le barrage sur une voiture existante.
    const officerPosition = position.clone().add(frame.normal.clone().multiplyScalar(radius + .55));
    if (this.traffic.some(car => {
      const margin = Math.max(1.1, car.boundingRadius + .35) + car.getSpeed() ** 2 / (2 * car.maxForce) + car.getSpeed() * .08;
      return car.position.distanceTo(position) < radius + margin
        || car.position.distanceTo(officerPosition) < .35 + margin;
    })) return null;
    const obstacle = new Barrier3D(position, radius, frame.direction);
    const officer = new Police3D(officerPosition, frame.direction);
    obstacle.officer = officer;
    this.barriers.push(obstacle);
    this.police.push(officer);
    this.obstacles.push(obstacle, officer);
    return obstacle;
  }

  setWeights(follow, separation, wander) {
    if (![follow, separation, wander].every(value => Number.isFinite(value) && value >= 0 && value <= 5)) {
      throw new RangeError('Les poids doivent être compris entre 0 et 5.');
    }
    this.weights = { follow, separation, wander };
    for (const snake of this.snakes) snake.setWeights(follow, separation, wander);
    for (const bus of this.buses) bus.setWeights(follow, separation, wander);
  }

  addFlock(count = 18) {
    if (!Number.isInteger(count) || count < 1 || count > 18) throw new RangeError('Une nuée contient de 1 à 18 drones.');
    if (this.boids.length + count > 72) return [];
    const index = Math.floor(this.rng() * this.circuit.points.length) % this.circuit.points.length;
    const spawn = this.circuit.spawn(index), groupId = this.nextFlockId++, added = [];
    for (let i = 0; i < count; i++) {
      const position = spawn.point.clone().add(new YUKA.Vector3((this.rng() - .5) * 4, 5.5 + (this.rng() - .5) * .5, (this.rng() - .5) * 4));
      const direction = spawn.direction.clone().add(new YUKA.Vector3((this.rng() - .5) * .3, 0, (this.rng() - .5) * .3)).normalize();
      const drone = new FlockDrone3D(position, direction, this.circuit.createPath(index, 5.5), groupId, this.flockWeights);
      this.boids.push(drone); this.register(drone); added.push(drone);
    }
    return added;
  }

  setFlockWeights(align, cohesion, separation) {
    if (![align, cohesion].every(value => Number.isFinite(value) && value >= 0 && value <= 2)
      || !Number.isFinite(separation) || separation < 0 || separation > 15) throw new RangeError('Poids de flocking invalides.');
    this.flockWeights = { align, cohesion, separation };
    for (const drone of this.boids) drone.setFlockWeights(this.flockWeights);
  }

  clearFlocks() {
    for (const drone of this.boids) this.manager.remove(drone);
    this.agents = this.agents.filter(agent => !(agent instanceof FlockDrone3D));
    this.boids = [];
  }

  prepareNeighborhoods() {
    const centers = new Map();
    for (const drone of this.boids) {
      if (!centers.has(drone.groupId)) centers.set(drone.groupId, { position: new YUKA.Vector3(), count: 0 });
      const center = centers.get(drone.groupId); center.position.add(drone.position); center.count++;
    }
    for (const center of centers.values()) center.position.divideScalar(center.count);
    for (const agent of this.agents) {
      if (agent instanceof FlockDrone3D) {
        agent.groupCenter.copy(centers.get(agent.groupId).position);
        agent.regroup.active = agent.position.distanceTo(agent.groupCenter) > 6;
        agent.flockNeighbors = this.boids.filter(other => other !== agent && other.groupId === agent.groupId
          && agent.position.squaredDistanceTo(other.position) < (agent.perceptionRadius * 2) ** 2);
        agent.neighbors = agent.flockNeighbors;
        agent.spacingNeighbors = this.boids.filter(other => other !== agent
          && agent.position.squaredDistanceTo(other.position) < agent.perceptionRadius ** 2);
        continue;
      }
      agent.neighbors = this.agents.filter(other => other !== agent
        && !(agent.ownerId !== undefined && other.ownerId === agent.ownerId)
        && agent.position.squaredDistanceTo(other.position) < agent.neighborhoodRadius ** 2);
    }
  }

  update(elapsed) {
    if (!Number.isFinite(elapsed) || elapsed <= 0) return;
    this.accumulator += Math.min(elapsed, .1);
    // Pas fixe pour garder la même locomotion à 30, 60 ou 120 images/seconde.
    while (this.accumulator >= 1 / 60 - 1e-10) {
      this.incident?.prepare(1/60);
      this.prepareNeighborhoods();
      for (const vehicle of this.traffic) {
        vehicle.road.prepare(vehicle);
        if(vehicle.navigation?.active){vehicle.overtake.leader=null;vehicle.overtake.weight=0;}
        else vehicle.overtake.prepare(vehicle, this.traffic, vehicle.road.circuit, this.trafficDistancePixels, 1 / 60, this.obstacles);
      }
      this.mission?.prepare(1 / 60);
      this.contacts.prepare([...this.traffic,...this.people.filter(person=>person.visible)],1/60,this.mission);
      this.manager.update(1 / 60);
      this.mission?.update(1 / 60);
      this.incident?.update(1/60);
      this.accumulator = Math.max(0, this.accumulator - 1 / 60);
    }
  }
}
