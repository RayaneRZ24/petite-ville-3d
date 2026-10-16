// Création des cibles au niveau de la scène : aucun déplacement codé à la main.
const TargetPopulation = (() => {
  const MAX_TARGETS = 24;

  function duplicateReady(targets, rng = Math.random) {
    const born = [];
    for (const parent of targets) {
      if (!parent.duplicationPending) continue;
      parent.duplicationPending = false;
      if (targets.length + born.length >= MAX_TARGETS) continue;
      const child = new TargetFuyante(parent.pos.x, parent.pos.y, rng);
      child.configure(parent.detectionRadius, parent.maxFleeSeconds);
      child.maxSpeed = parent.fleeSpeed;
      child.fleeSpeed = parent.fleeSpeed;
      child.maxForce = parent.maxForce;
      child.cruiseSpeed = parent.cruiseSpeed;
      child.protected = false;
      child.state = 'recovering';
      child.staminaSeconds = 0;
      child.birthAge = 0;
      child.splitAge = 0;
      parent.splitAge = 0;
      // Vitesse initiale divergente, puis steering et locomotion habituels.
      const angle = Math.atan2(parent.vel.y, parent.vel.x) + (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
      const speed = Math.min(child.maxSpeed, Math.max(child.cruiseSpeed, parent.vel.mag()));
      child.vel.set(Math.cos(angle) * speed, Math.sin(angle) * speed);
      child.wanderAngle = angle;
      born.push(child);
    }
    targets.push(...born);
    return born;
  }

  return { MAX_TARGETS, duplicateReady };
})();
