// SeparationBehavior de Yuka ; seul le cas des positions confondues est complété.
class LocalSeparation3D extends YUKA.SeparationBehavior {
  calculate(vehicle, force, delta) {
    super.calculate(vehicle, force, delta);
    for (const neighbor of vehicle.neighbors) {
      if (vehicle.position.squaredDistanceTo(neighbor.position) < 1e-10) {
        force.x += vehicle.agentId < neighbor.agentId ? -1 : 1;
      }
    }
    return force;
  }
}
