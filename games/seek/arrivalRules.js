// Téléportations d'arrivée dans le contrôleur de scène, jamais dans le steering.
const ArrivalRules = (() => {
  const contacts = new WeakMap();

  function respawnTarget(target, vehicles, w, h, rng = Math.random) {
    const clearance = Math.max(20, ...vehicles.map(v => v.r + 4));
    const point = SeekPopulation.spawnPosition(target.pos, w, h, target.r, rng,
      vehicles.map(vehicle => vehicle.pos), clearance);
    if (!point) return false;
    target.pos.set(point.x, point.y);
    target.resetMotion();
    return true;
  }

  function nearestTarget(vehicle, targets) {
    let nearest = null, distance = Infinity;
    for (const candidate of targets) {
      const d = (vehicle.pos.x - candidate.pos.x) ** 2 + (vehicle.pos.y - candidate.pos.y) ** 2;
      if (d < distance) { distance = d; nearest = candidate; }
    }
    return nearest;
  }

  function touching(vehicle, target) {
    return target.birthAge >= 0.7 && SeekPopulation.hasArrived(vehicle, target.pos);
  }

  function step(vehicles, targetOrTargets, w, h, mode = 'vehicle', rng = Math.random,
    elapsedSeconds = 1 / 60, onCapture = () => {}) {
    if (mode !== 'vehicle' && mode !== 'target') throw new RangeError('Mode de réapparition inconnu.');
    const targets = Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets];
    let targetRespawned = false;
    const attempted = new Set(), captured = new Set();
    const moveTarget = target => {
      if (attempted.has(target)) return;
      attempted.add(target);
      targetRespawned = respawnTarget(target, vehicles, w, h, rng) || targetRespawned;
    };
    const capture = (vehicle, target) => {
      captured.add(vehicle);
      const previous = contacts.get(vehicle) ?? new Set();
      if (!previous.has(target)) {
        previous.add(target);
        contacts.set(vehicle, previous);
        vehicle.gainExperience?.();
        target.onCaptured?.();
        onCapture(vehicle, target);
      }
      if (mode === 'target') moveTarget(target);
      else SeekPopulation.respawn(vehicle, target.pos, w, h, rng, targets.map(t => t.pos));
    };

    for (const target of targets) target.animate(elapsedSeconds);
    for (const vehicle of vehicles) {
      vehicle.animate?.(elapsedSeconds);
      const previous = contacts.get(vehicle);
      if (previous) for (const t of previous) {
        if (!targets.includes(t) || !touching(vehicle, t)) previous.delete(t);
      }
    }
    // Contacts avant déplacement : une capture annule la duplication.
    const initial = vehicles.map(v => [v, targets.find(t => touching(v, t))]);
    for (const [vehicle, target] of initial) if (target) capture(vehicle, target);
    for (const target of targets) {
      target.applyAvoidance(vehicles, elapsedSeconds);
      target.update();
      target.edges();
    }
    for (const vehicle of vehicles) {
      if (mode === 'vehicle' && captured.has(vehicle)) continue;
      const target = nearestTarget(vehicle, targets);
      if (!target) continue;
      // Un seul déplacement hérité par image, même avec plusieurs cibles.
      const contact = targets.find(t => touching(vehicle, t));
      if (contact && !captured.has(vehicle)) { capture(vehicle, contact); continue; }
      vehicle.applyBehaviors(target.pos);
      vehicle.update();
      vehicle.edges();
      const after = targets.find(t => touching(vehicle, t));
      if (after && !captured.has(vehicle)) capture(vehicle, after);
    }
    return targetRespawned;
  }
  return { respawnTarget, nearestTarget, step };
})();
