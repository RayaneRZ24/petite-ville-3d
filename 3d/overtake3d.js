// Perception et sélection de voie séparées du calcul de force et de la locomotion.
class Overtake3D extends YUKA.SteeringBehavior {
  constructor() {
    super();
    this.weight = 0;
    this.leader = null;
    this.side = 0;
    this.elapsed = 0;
    this.cooldown = 0;
    this.target = new YUKA.Vector3();
    this.seek = new YUKA.SeekBehavior(this.target);
  }

  prepare(vehicle, traffic, circuit, distancePixels, delta, obstacles) {
    const frame = circuit.frameAt(vehicle.position);
    const outside = vehicle.road?.joining || vehicle.position.distanceTo(frame.point) > circuit.radius - 1.2;
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.leader) {
      this.elapsed += delta;
      const ahead = this.leader.position.clone().sub(vehicle.position).dot(frame.direction);
      if (outside || !traffic.includes(this.leader) || ahead < -2 || this.elapsed >= 8) {
        this.leader = null;
        this.cooldown = 1;
      }
    }
    if (!outside && !this.leader && this.cooldown === 0) {
      let nearest = Infinity, candidate = null;
      for (const other of traffic) {
        if (other === vehicle) continue;
        const relative = other.position.clone().sub(vehicle.position);
        const ahead = relative.dot(frame.direction);
        const lateral = Math.abs(relative.dot(frame.normal));
        if (ahead > 0 && ahead < nearest && lateral < 1.1
          && (other.getSpeed() < .2 || other.velocity.clone().normalize().dot(frame.direction) > .5)
          && distancePixels(vehicle, other) <= 100) {
          candidate = other; nearest = ahead;
        }
      }
      if (candidate) {
        // Choisir un côté libre, dans la largeur du circuit, puis le conserver.
        const sides = [-1, 1].map(side => {
          const lane = candidate.position.clone().add(frame.normal.clone().multiplyScalar(side * 2.1));
          const offset = Math.abs(lane.clone().sub(frame.point).dot(frame.normal));
          const blocked = offset > circuit.radius - vehicle.boundingRadius
            || [...obstacles, ...traffic.filter(other => other !== vehicle && other !== candidate)].some(
              other => lane.distanceTo(other.position) < other.boundingRadius + vehicle.boundingRadius + .5);
          return { side, blocked };
        });
        const free = sides.find(item => !item.blocked);
        if (free) { this.leader = candidate; this.side = free.side; this.elapsed = 0; }
      }
    }
    const passing = this.leader !== null;
    const speed = passing ? Math.min(12, Math.max(vehicle.baseSpeed * 1.65, this.leader.getSpeed() + 2.5)) : vehicle.baseSpeed;
    vehicle.maxSpeed += (speed - vehicle.maxSpeed) * Math.min(1, delta * 2);
    vehicle.follow.weight = (vehicle.followWeight ?? 2) * (passing ? .075 : 1);
    vehicle.onPath.weight = passing ? 0 : (vehicle.onPathWeight ?? 2);
    this.weight = passing ? 4 : 0;
    // Une cible locale décalée ; seul Seek produit une force, aucune position n'est imposée.
    this.target.copy(frame.point).add(frame.direction.multiplyScalar(6))
      .add(frame.normal.multiplyScalar(passing ? this.side * 2.1 : 0));
  }

  calculate(vehicle, force) {
    this.seek.calculate(vehicle, force);
    if (force.length() > vehicle.maxForce) force.normalize().multiplyScalar(vehicle.maxForce);
    return force;
  }
}
