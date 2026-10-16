// Arrival nécessaire à la chaîne ; le Vehicle de cet exemple ne le fournit pas.
const SnakeArrival = {
  force(entity, position, brakingRadius = 20, leaderVelocity = createVector(0, 0)) {
    const desired = p5.Vector.sub(position, entity.pos);
    const distance = desired.mag();
    if (distance > 0) desired.setMag(entity.maxSpeed * Math.min(1, distance / brakingRadius));
    // La vitesse du prédécesseur évite de freiner devant un objectif lui-même mobile.
    desired.add(leaderVelocity).limit(entity.maxSpeed);
    return desired.sub(entity.vel).limit(entity.maxForce);
  },
};
