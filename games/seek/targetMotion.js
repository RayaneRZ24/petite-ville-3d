// Wander continu : variation locale de direction, sans trajectoire imposée.
const TargetMotion = (() => {
  function wander(target, angle, rng = Math.random) {
    const nextAngle = angle + (rng() - 0.5) * 0.12;
    const speed = Math.min(target.cruiseSpeed, target.maxSpeed);
    const desired = createVector(Math.cos(nextAngle) * speed, Math.sin(nextAngle) * speed);
    const force = p5.Vector.sub(desired, target.vel).mult(0.12).limit(target.maxForce);
    return { angle: nextAngle, force };
  }
  return { wander };
})();
