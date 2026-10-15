// Priorité de sécurité : rejoindre la route, puis anticiper ses bords par steering.
// Ne modifie jamais position/vitesse ; la locomotion reste celle de Yuka.
class RoadContainment3D extends YUKA.SteeringBehavior {
  constructor(circuit) {
    super();
    this.circuit = circuit;
    this.weight = 3;
    this.joining = false;
    this.correcting = false;
    this.entry = new YUKA.Vector3();
    this.target = new YUKA.Vector3();
    this.seek = new YUKA.SeekBehavior(this.target);
  }

  prepare(vehicle) {
    const frame = this.circuit.frameAt(vehicle.position);
    const distance = vehicle.position.distanceTo(frame.point);
    if (!this.joining && distance > this.circuit.radius - Math.max(.75, vehicle.boundingRadius + .25)) {
      this.joining = true;
      // Verrouiller un point d'entrée évite de changer de côté au milieu du circuit.
      this.entry.copy(frame.point).add(frame.direction.clone().multiplyScalar(.8));
    }
    if (this.joining && distance < 1.4) this.joining = false;
    // Après un évitement/dépassement, le waypoint manqué ne doit pas rester derrière.
    if (!this.joining) this.circuit.alignPath?.(vehicle.follow.path, vehicle.position, vehicle.velocity);
  }

  calculate(vehicle, force) {
    force.set(0, 0, 0);
    if (this.joining) {
      this.target.copy(this.entry);
      this.correcting = true;
    } else {
      const frame = this.circuit.frameAt(vehicle.position);
      const relative = vehicle.position.clone().sub(frame.point);
      const distance = relative.length();
      const outward = distance > 1e-8 ? Math.max(0, vehicle.velocity.dot(relative.clone().normalize())) : 0;
      const stoppingDistance = outward * outward / (2 * vehicle.maxForce);
      const prediction = vehicle.position.clone().add(vehicle.velocity.clone().multiplyScalar(.7));
      const predictedFrame = this.circuit.frameAt(prediction);
      const predictedDistance = prediction.distanceTo(predictedFrame.point);
      // Marge inclut le demi-diagonal de la voiture et le temps de freinage latéral.
      const safeWidth = this.circuit.radius - Math.max(1.2, vehicle.boundingRadius + .5);
      const risk = distance + stoppingDistance >= safeWidth || predictedDistance >= safeWidth;
      if (!risk && (!this.correcting || (distance < safeWidth - .35 && predictedDistance < safeWidth - .35))) {
        this.correcting = false;
        return force;
      }
      this.correcting = true;
      this.target.copy(frame.point).add(frame.direction.clone().multiplyScalar(
        Math.max(1, Math.max(0, vehicle.velocity.dot(frame.direction)) * .35)));
    }
    this.seek.calculate(vehicle, force);
    force.multiplyScalar(4); // Réponse amortie en secondes, avant limitation physique.
    if (force.length() > vehicle.maxForce) force.normalize().multiplyScalar(vehicle.maxForce);
    return force;
  }
}
