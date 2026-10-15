// Adaptation de Vehicle.avoid() de 6-ObstacleAvoidance, sans nouvel algorithme.
// Yuka mesure la vitesse en unités/seconde : 30 et 15 images à 60 Hz = .5 et .25 s.
class TeacherAvoidance3D extends YUKA.SteeringBehavior {
  constructor(obstacles) {
    super();
    this.obstacles = obstacles;
    this.weight = 3; // Poids d'évitement de l'exemple fourni.
    this.ahead = new YUKA.Vector3();
    this.halfAhead = new YUKA.Vector3();
    this.detected = false;
  }

  calculate(vehicle, force) {
    force.set(0, 0, 0);
    this.detected = false;
    this.ahead.copy(vehicle.velocity).multiplyScalar(.5).add(vehicle.position);
    this.halfAhead.copy(vehicle.velocity).multiplyScalar(.25).add(vehicle.position);
    // Même choix que getObstacleLePlusProche() : centre le plus proche.
    let obstacle, nearest = Infinity;
    for (const candidate of this.obstacles) {
      const distance = vehicle.position.distanceTo(candidate.position);
      if (distance < nearest) { nearest = distance; obstacle = candidate; }
    }
    if (!obstacle) return force;
    let point = this.ahead;
    let distance = obstacle.position.distanceTo(point);
    const halfDistance = obstacle.position.distanceTo(this.halfAhead);
    if (halfDistance < distance) { distance = halfDistance; point = this.halfAhead; }
    const currentDistance = obstacle.position.distanceTo(vehicle.position);
    if (currentDistance < distance) { distance = currentDistance; point = vehicle.position; }
    // L'exemple utilise r = rayon dessiné * 3 puis largeur = r / 2.
    if (distance < obstacle.boundingRadius + vehicle.boundingRadius * 1.5) {
      this.detected = true;
      force.copy(point).sub(obstacle.position).normalize().multiplyScalar(vehicle.maxForce / 2);
    }
    return force;
  }
}
