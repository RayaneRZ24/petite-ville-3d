// Perception et paramètres : aucune mutation d'entité ni de position.
const FleeingTargetBehavior = (() => {
  const ESCAPE_DISTANCE = 300;
  function nearest(target, vehicles, radius = ESCAPE_DISTANCE) {
    let vehicle = null;
    let distance = Infinity;
    for (const candidate of vehicles) {
      if (candidate === target) continue;
      const current = p5.Vector.sub(candidate.pos, target.pos).mag();
      if (current <= radius && current < distance) {
        vehicle = candidate;
        distance = current;
      }
    }
    return { vehicle, distance };
  }
  function boostSpeed(target, elapsed) {
    const progress = Math.min(1, elapsed / 0.4);
    const desired = target.cruiseSpeed + (target.fleeSpeed - target.cruiseSpeed) * progress;
    return Math.min(target.fleeSpeed, Math.max(target.vel.mag(), desired));
  }
  return { ESCAPE_DISTANCE, nearest, boostSpeed };
})();
