// Gestion de scène : aucun calcul de steering ou de locomotion ici.
const SeekPopulation = (() => {
  const MIN_COUNT = 1;
  const MAX_COUNT = 200;
  const INITIAL_COUNT = 20;
  const ARRIVAL_RADIUS = 16;
  const SPAWN_DISTANCE = ARRIVAL_RADIUS + 4;

  function distanceSquared(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function hasArrived(vehicle, target) {
    return distanceSquared(vehicle.pos, target) <= Math.max(ARRIVAL_RADIUS, vehicle.r ?? 0) ** 2;
  }

  // null signifie qu'aucune position ne respecte la zone d'exclusion.
  function spawnPosition(target, w, h, radius, rng = Math.random, additionalTargets = [], clearance = SPAWN_DISTANCE) {
    const excluded = [target, ...additionalTargets];
    const valid = point => excluded.every(position => distanceSquared(point, position) > clearance ** 2);
    const marginX = w >= radius * 2 ? radius : 0;
    const marginY = h >= radius * 2 ? radius : 0;
    const bounds = { left: marginX, right: w - marginX, top: marginY, bottom: h - marginY };
    for (let attempt = 0; attempt < 32; attempt++) {
      const point = {
        x: bounds.left + rng() * (bounds.right - bounds.left),
        y: bounds.top + rng() * (bounds.bottom - bounds.top),
      };
      if (valid(point)) return point;
    }
    const corner = farthestCorner(target, bounds, additionalTargets);
    if (valid(corner)) return corner;
    const fallback = farthestCorner(target, { left: 0, right: w, top: 0, bottom: h }, additionalTargets);
    return valid(fallback) ? fallback : null;
  }

  function farthestCorner(target, bounds, additionalTargets = []) {
    const clearance = point => Math.min(...[target, ...additionalTargets].map(position => distanceSquared(point, position)));
    const corners = [
      { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom },
    ];
    return corners.reduce((best, point) =>
      clearance(point) > clearance(best) ? point : best);
  }

  function resize(vehicles, count, target, w, h, createVehicle, rng = Math.random) {
    if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
      throw new RangeError('Le nombre de véhicules doit être un entier entre 1 et 200.');
    }
    if (count < vehicles.length) vehicles.length = count;
    while (vehicles.length < count) {
      const vehicle = createVehicle(0, 0);
      const point = spawnPosition(target, w, h, vehicle.r, rng)
        ?? farthestCorner(target, { left: 0, right: w, top: 0, bottom: h });
      vehicle.pos.set(point.x, point.y);
      vehicles.push(vehicle);
    }
  }

  function respawn(vehicle, target, w, h, rng = Math.random, additionalTargets = []) {
    const point = spawnPosition(target, w, h, vehicle.r, rng, additionalTargets, Math.max(SPAWN_DISTANCE, vehicle.r + 4));
    if (!point) return false;
    vehicle.pos.set(point.x, point.y);
    vehicle.vel.set(0, 0);
    vehicle.acc.set(0, 0);
    return true;
  }

  function step(vehicle, target, w, h, rng = Math.random,
    onArrival = entity => respawn(entity, target, w, h, rng)) {
    if (hasArrived(vehicle, target)) {
      onArrival(vehicle);
      return;
    }
    vehicle.applyBehaviors(target);
    vehicle.update();
    vehicle.edges();
    if (hasArrived(vehicle, target)) onArrival(vehicle);
  }

  function bindSlider(slider, output, vehicles, target, dimensions, createVehicle, rng = Math.random) {
    const synchronize = () => {
      const { width: w, height: h } = dimensions();
      resize(vehicles, Number(slider.value), target, w, h, createVehicle, rng);
      output.value = `${vehicles.length} / ${MAX_COUNT}`;
    };
    slider.addEventListener('input', synchronize);
    synchronize();
  }

  return { MIN_COUNT, MAX_COUNT, INITIAL_COUNT, ARRIVAL_RADIUS,
    hasArrived, spawnPosition, resize, respawn, step, bindSlider };
})();
