// Valide les forces proposées avant la locomotion ; aucune position n'est corrigée.
class CollisionSafety3D extends YUKA.SteeringBehavior {
  constructor(vehicle, circuit, obstacles, behaviors) {
    super();
    this.circuit = circuit;
    this.obstacles = obstacles;
    this.intent = new YUKA.SteeringManager(vehicle);
    for (const behavior of behaviors) this.intent.add(behavior);
    this.target = new YUKA.Vector3();
    this.seek = new YUKA.SeekBehavior(this.target);
    this.intervening = false;
    this.samplePosition = vehicle.position.clone();
    this.sampleTime = 0;
    this.escape = null;
    this.endOffset = 0;
    this.planAge=Infinity;this.cachedForce=null;this.cachedPosition=vehicle.position.clone();this.cachedObstacleCount=0;
  }

  updateProgress(vehicle, delta) {
    if (this.escape) {
      const frame = this.circuit.frameAt(this.escape.obstacle.position);
      const passed = vehicle.position.clone().sub(this.escape.obstacle.position).dot(frame.direction);
      if (!this.obstacles.includes(this.escape.obstacle) || passed > this.escape.obstacle.boundingRadius + 2) this.escape = null;
    }
    this.sampleTime += Number.isFinite(delta) && delta > 0 ? delta : 0;
    if (this.sampleTime < 1) return;
    const progress = vehicle.position.distanceTo(this.samplePosition);
    this.samplePosition.copy(vehicle.position);
    this.sampleTime = 0;
    if (progress >= .4 || this.escape) return;
    const frame = this.circuit.frameAt(vehicle.position);
    const blocker = this.obstacles.filter(obstacle => {
      const relative = obstacle.position.clone().sub(vehicle.position);
      return relative.dot(frame.direction) > -obstacle.boundingRadius
        && relative.length() < obstacle.boundingRadius + 5;
    }).sort((a, b) => vehicle.position.squaredDistanceTo(a.position) - vehicle.position.squaredDistanceTo(b.position))[0];
    if (!blocker) return;
    const obstacleFrame = this.circuit.frameAt(blocker.position);
    const options = [-2.7, -1.8, 0, 1.8, 2.7].map(offset => {
      const point = obstacleFrame.point.clone().add(obstacleFrame.normal.clone().multiplyScalar(offset));
      const clearance = this.obstacles.reduce((minimum, obstacle) => Math.min(minimum,
        point.distanceTo(obstacle.position) - obstacle.boundingRadius), Infinity);
      return { offset, clearance };
    }).filter(option => option.clearance > Math.max(1.1, vehicle.boundingRadius + .35)).sort((a, b) => b.clearance - a.clearance);
    if (options.length) this.escape = { obstacle: blocker, offset: options[0].offset };
  }

  evaluate(vehicle, acceleration) {
    let x = vehicle.position.x, z = vehicle.position.z;
    let vx = vehicle.velocity.x, vz = vehicle.velocity.z;
    const initialFrame = this.circuit.frameAt(vehicle.position);
    const initialOffset = vehicle.position.distanceTo(initialFrame.point);
    const width = Math.max(this.circuit.radius - Math.max(.85, vehicle.boundingRadius + .25), initialOffset + .02);
    const nearby = this.obstacles.filter(obstacle => vehicle.position.distanceTo(obstacle.position)
      < vehicle.maxSpeed * 1.1 + obstacle.boundingRadius + 2);
    for (let step = 0; step < 40; step++) {
      const oldX = x, oldZ = z;
      const oldVx = vx, oldVz = vz;
      if (step < 20) {
        vx += acceleration.x * .05; vz += acceleration.z * .05;
      } else {
        // Vérifier aussi qu'il reste assez de place pour s'arrêter après la prévision.
        const speed = Math.hypot(vx, vz);
        const reduction = speed ? Math.max(0, 1 - vehicle.maxForce * .05 / speed) : 0;
        vx *= reduction; vz *= reduction;
      }
      const speed = Math.hypot(vx, vz);
      if (speed > vehicle.maxSpeed) { vx *= vehicle.maxSpeed / speed; vz *= vehicle.maxSpeed / speed; }
      x += (oldVx + vx) * .025; z += (oldVz + vz) * .025;
      // Distance au segment balayé, pas seulement aux points aux extrémités.
      const dx = x - oldX, dz = z - oldZ, length = dx * dx + dz * dz;
      for (const obstacle of nearby) {
        const t = length ? Math.max(0, Math.min(1,
          ((obstacle.position.x - oldX) * dx + (obstacle.position.z - oldZ) * dz) / length)) : 0;
        const distanceSq = (oldX + dx * t - obstacle.position.x) ** 2 + (oldZ + dz * t - obstacle.position.z) ** 2;
        // Une voiture peut finir légèrement dans la marge de prudence après freinage.
        // Elle doit pouvoir en sortir : ne pas confondre cette marge avec l'obstacle réel.
        const relativeX = vehicle.position.x - obstacle.position.x;
        const relativeZ = vehicle.position.z - obstacle.position.z;
        const initialDistance = Math.hypot(relativeX, relativeZ);
        const closing = initialDistance ? Math.max(0,
          -(relativeX * vehicle.velocity.x + relativeZ * vehicle.velocity.z) / initialDistance) : 0;
        const clearance = Math.min(obstacle.boundingRadius + Math.max(1, vehicle.boundingRadius + .25), Math.max(obstacle.boundingRadius + Math.max(.78, vehicle.boundingRadius + .1),
          initialDistance - closing * closing / (2 * vehicle.maxForce) - closing * .08 - .005));
        if (distanceSq < clearance ** 2) return -Infinity;
      }
      if (step % 5 === 4) {
        const point = new YUKA.Vector3(x, 0, z);
        if (point.distanceTo(this.circuit.frameAt(point).point) > width) return -Infinity;
      }
    }
    const clearance = nearby.reduce((minimum, obstacle) => Math.min(minimum,
      Math.hypot(x - obstacle.position.x, z - obstacle.position.z) - obstacle.boundingRadius), 4);
    const end = new YUKA.Vector3(x, 0, z), endFrame = this.circuit.frameAt(end);
    this.endOffset = end.clone().sub(endFrame.point).dot(endFrame.normal);
    const commitment = this.escape ? -.8 * Math.abs(this.endOffset - this.escape.offset) : 0;
    return (x - vehicle.position.x) * initialFrame.direction.x + (z - vehicle.position.z) * initialFrame.direction.z + .2 * clearance + commitment;
  }

  calculate(vehicle, force, delta) {
    if(vehicle.navigation?.active){
      vehicle.navigation.calculate(vehicle,force,delta);
      // Le réseau peut être parcouru dans les deux sens : conserver le vrai avoid()
      // du professeur, puis laisser TrafficContacts borner les contacts et les bords.
      const avoidance=new YUKA.Vector3();vehicle.avoidance.calculate(vehicle,avoidance,delta);
      force.add(avoidance.multiplyScalar(1.5));
      if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);
      return force;
    }
    this.intent.calculate(delta, force);
    this.updateProgress(vehicle, delta);
    this.planAge+=Number.isFinite(delta)&&delta>0?delta:Infinity;
    // Le choix coûteux d'un passage local reste valable 80 ms au maximum.
    // Les contraintes de contact sont toujours recalculées à chacun des 60 pas/s.
    if(this.cachedForce&&this.planAge<.08&&this.cachedObstacleCount===this.obstacles.length&&vehicle.position.distanceTo(this.cachedPosition)<.35){
      force.copy(this.cachedForce);if(force.length()>vehicle.maxForce)force.normalize().multiplyScalar(vehicle.maxForce);return force;
    }
    this.intervening = false;
    const nearObstacle=this.obstacles.some(obstacle=>vehicle.position.squaredDistanceTo(obstacle.position)<(vehicle.maxSpeed*1.1+obstacle.boundingRadius+2)**2);
    if (!nearObstacle || (!this.escape && Number.isFinite(this.evaluate(vehicle, force)))) return force;
    this.intervening = true;
    const frame = this.circuit.frameAt(vehicle.position);
    if (this.escape?.waypoint) {
      const maneuver = this.escape;
      this.target.copy(maneuver.waypoint);
      const committed = new YUKA.Vector3();
      this.seek.calculate(vehicle, committed);
      committed.add(vehicle.velocity).multiplyScalar(Math.min(maneuver.speed, vehicle.maxSpeed) / vehicle.maxSpeed).sub(vehicle.velocity).multiplyScalar(maneuver.gain);
      if (committed.length() > vehicle.maxForce) committed.normalize().multiplyScalar(vehicle.maxForce);
      if (vehicle.position.distanceTo(maneuver.waypoint) > .2 && Number.isFinite(this.evaluate(vehicle, committed))) return force.copy(committed);
      maneuver.waypoint = null;
    }
    const brake = vehicle.velocity.clone().multiplyScalar(-6);
    if (brake.length() > vehicle.maxForce) brake.normalize().multiplyScalar(vehicle.maxForce);
    let best = brake, score = this.escape ? -Infinity : this.evaluate(vehicle, brake);
    let maneuver = null;
    // Seek Yuka vers des points locaux dans la chaussée ; choisir une force admissible.
    for (const [offset, gain, scale, forward] of [-2.7, -1.8, 0, 1.8, 2.7].flatMap(offset =>
      [[offset, 1, .25, 1], [offset, 4, .25, 1], [offset, 1, 1, 1], [offset, 4, 1, 1], [offset, 1, .12, 0]])) {
      this.target.copy(frame.point).add(frame.direction.clone().multiplyScalar(forward * Math.max(3, vehicle.getSpeed() * .6)))
        .add(frame.normal.clone().multiplyScalar(offset));
      const candidate = new YUKA.Vector3();
      this.seek.calculate(vehicle, candidate);
      const desiredSpeed = Math.min(vehicle.maxSpeed, Math.max(.8, vehicle.maxSpeed * scale));
      candidate.add(vehicle.velocity).multiplyScalar(desiredSpeed / vehicle.maxSpeed).sub(vehicle.velocity);
      candidate.multiplyScalar(gain);
      if (candidate.length() > vehicle.maxForce) candidate.normalize().multiplyScalar(vehicle.maxForce);
      if (this.escape && candidate.length() < .01) continue;
      const value = this.evaluate(vehicle, candidate);
      if (value > score) {
        score = value; best = candidate;
        maneuver = { direction: this.target.clone().sub(vehicle.position).normalize(), speed: desiredSpeed, gain };
      }
    }
    if (this.escape) {
      // Près d'une extrémité de barrière, le point de voie peut être inaccessible.
      // Autoriser de petits pas latéraux ou un recul avant de reprendre le passage.
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4;
        const direction = frame.direction.clone().multiplyScalar(Math.cos(angle))
          .add(frame.normal.clone().multiplyScalar(Math.sin(angle)));
        this.target.copy(vehicle.position).add(direction);
        const candidate = new YUKA.Vector3();
        this.seek.calculate(vehicle, candidate);
        candidate.add(vehicle.velocity).multiplyScalar(Math.min(1.2, vehicle.maxSpeed) / vehicle.maxSpeed).sub(vehicle.velocity);
        if (candidate.length() > vehicle.maxForce) candidate.normalize().multiplyScalar(vehicle.maxForce);
        const value = this.evaluate(vehicle, candidate);
        if (value > score) { score = value; best = candidate; maneuver = { direction, speed: Math.min(1.2, vehicle.maxSpeed), gain: 1 }; }
      }
    }
    if (this.escape && maneuver) {
      this.escape.waypoint = vehicle.position.clone().add(maneuver.direction.multiplyScalar(.9));
      this.escape.speed = maneuver.speed;
      this.escape.gain = maneuver.gain;
    }
    this.planAge=0;this.cachedPosition.copy(vehicle.position);this.cachedForce=best.clone();this.cachedObstacleCount=this.obstacles.length;
    return force.copy(best);
  }
}
