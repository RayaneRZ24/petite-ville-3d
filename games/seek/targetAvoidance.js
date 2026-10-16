// Perception et forces réutilisables ; aucune mise à jour de position ici.
const TargetAvoidance = (() => {
  const DETECTION_RADIUS = 80;
  const LOOKAHEAD_FRAMES = 6;
  const RELEASE_MARGIN = 32;
  const SWITCH_MARGIN = 12;

  function nearestVehicle(target, vehicles,
    radius = target.detectionRadius + (target.isFleeing ? RELEASE_MARGIN : 0)) {
    let nearest = null;
    let nearestDistance = Infinity;
    let previousDistance = Infinity;
    for (const vehicle of vehicles) {
      if (vehicle === target) continue;
      const offset = p5.Vector.sub(vehicle.pos, target.pos);
      const relativeVelocity = p5.Vector.sub(vehicle.vel, target.vel);
      const speedSquared = relativeVelocity.x ** 2 + relativeVelocity.y ** 2;
      // Rayon de la flèche inclus : sa pointe touche le cercle avant son centre.
      const contactRadius = radius + vehicle.r;
      const distance = offset.x ** 2 + offset.y ** 2;
      // Perception locale : ignorer ce qui ne peut pas atteindre la zone à court terme.
      if (distance > (contactRadius + Math.sqrt(speedSquared) * LOOKAHEAD_FRAMES) ** 2) continue;
      const approachTime = speedSquared === 0 ? 0 : Math.max(0, Math.min(LOOKAHEAD_FRAMES,
        -(offset.x * relativeVelocity.x + offset.y * relativeVelocity.y) / speedSquared));
      const predictedDistance = (offset.x + relativeVelocity.x * approachTime) ** 2
        + (offset.y + relativeVelocity.y * approachTime) ** 2;
      if (predictedDistance <= contactRadius ** 2) {
        if (vehicle === target.threat) previousDistance = distance;
        if (distance < nearestDistance) {
          nearest = vehicle;
          nearestDistance = distance;
        }
      }
    }
    // Éviter d'alterner entre deux flèches presque à la même distance.
    // Une flèche très proche garde toujours la priorité.
    if (nearest && Math.sqrt(nearestDistance) > target.r + nearest.r + 32
      && Math.sqrt(previousDistance) <= Math.sqrt(nearestDistance) + SWITCH_MARGIN) {
      return target.threat;
    }
    return nearest;
  }

  function fleeForce(target, threat) {
    const fallback = createVector(threat.vel.x, threat.vel.y);
    if (fallback.mag() === 0) fallback.set(target.vel.x, target.vel.y);
    if (fallback.mag() === 0) fallback.set(1, 0);
    return FleeBehavior.force(target, threat.pos, fallback);
  }

  function brakeForce(target) {
    const force = p5.Vector.sub(createVector(0, 0), target.vel);
    // Décélération exponentielle ; arrêter exactement une vitesse imperceptible.
    if (target.vel.mag() > 0.02) force.mult(0.12);
    return force.limit(target.maxForce);
  }

  function smoothFleeForce(target, threat, previousForce, force = fleeForce(target, threat)) {
    const distance = p5.Vector.sub(target.pos, threat.pos).mag();
    const contactRadius = target.detectionRadius + threat.r;
    const urgentRadius = target.r + threat.r + 32;
    const urgency = Math.max(0, Math.min(1,
      (contactRadius - distance) / Math.max(1, contactRadius - urgentRadius)));
    const blend = 0.25 + 0.75 * urgency;
    // Filtrer la force, jamais la position : la locomotion reste celle de Vehicle.
    return createVector(previousForce.x, previousForce.y).mult(1 - blend)
      .add(force.mult(blend)).limit(target.maxForce);
  }

  return { DETECTION_RADIUS, LOOKAHEAD_FRAMES, RELEASE_MARGIN, SWITCH_MARGIN,
    nearestVehicle, fleeForce, smoothFleeForce, brakeForce };
})();
