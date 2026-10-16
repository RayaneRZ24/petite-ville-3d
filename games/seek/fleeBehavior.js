// Deux étapes de l'exercice : inverser seek, puis inverser la vitesse désirée.
const FleeBehavior = (() => {
  function invertedSeek(vehicle, position) {
    return vehicle.seek(position).mult(-1);
  }

  function force(vehicle, position, fallback = createVector(1, 0)) {
    const desired = p5.Vector.sub(vehicle.pos, position);
    if (desired.mag() === 0) desired.set(fallback.x, fallback.y);
    desired.setMag(vehicle.maxSpeed);
    return p5.Vector.sub(desired, vehicle.vel).limit(vehicle.maxForce);
  }

  return { invertedSeek, force };
})();
