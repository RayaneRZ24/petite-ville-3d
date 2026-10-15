// Adaptation des méthodes align/separation/cohesion de 7-Boids/boids.js.
const BoidRules3D = {
  limit(force, maximum) {
    if (force.length() > maximum) force.normalize().multiplyScalar(maximum);
    return force;
  },

  align(vehicle, neighbors) {
    const desired = new YUKA.Vector3(); let total = 0;
    for (const other of neighbors) {
      if (other !== vehicle && vehicle.position.distanceTo(other.position) < vehicle.perceptionRadius) {
        desired.add(other.velocity); total++;
      }
    }
    if (!total) return desired;
    desired.divideScalar(total).normalize().multiplyScalar(vehicle.maxSpeed).sub(vehicle.velocity);
    return this.limit(desired, vehicle.maxForce);
  },

  cohesion(vehicle, neighbors) {
    const center = new YUKA.Vector3(); let total = 0;
    for (const other of neighbors) {
      if (other !== vehicle && vehicle.position.distanceTo(other.position) < vehicle.perceptionRadius * 2) {
        center.add(other.position); total++;
      }
    }
    if (!total) return center;
    center.divideScalar(total);
    const seek = new YUKA.SeekBehavior(center), force = new YUKA.Vector3();
    seek.calculate(vehicle, force);
    return this.limit(force, vehicle.maxForce);
  },

  separation(vehicle, neighbors) {
    const desired = new YUKA.Vector3(); let total = 0;
    for (const other of neighbors) {
      if (other === vehicle) continue;
      const distance = vehicle.position.distanceTo(other.position);
      if (distance >= vehicle.perceptionRadius) continue;
      // (position - voisin) / d² = vecteur normalisé de norme 1/d.
      if (distance > 1e-8) desired.add(vehicle.position.clone().sub(other.position).divideScalar(distance * distance));
      else desired.x += vehicle.agentId < other.agentId ? -1 : 1;
      total++;
    }
    if (!total) return desired;
    desired.divideScalar(total).normalize().multiplyScalar(vehicle.maxSpeed).sub(vehicle.velocity);
    return this.limit(desired, vehicle.maxForce);
  },
};

class FlockingRule3D extends YUKA.SteeringBehavior {
  constructor(rule) { super(); this.rule = rule; }
  calculate(vehicle, force) {
    const neighbors = this.rule === 'separation' ? vehicle.spacingNeighbors : vehicle.flockNeighbors;
    return force.copy(BoidRules3D[this.rule](vehicle, neighbors));
  }
}
