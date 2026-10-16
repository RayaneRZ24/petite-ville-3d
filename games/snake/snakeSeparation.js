// Réutilise separate() fourni ; ajoute un repli pour les positions exactement confondues.
const SnakeSeparation = (() => {
  const ids = new WeakMap();
  let nextId = 0;
  function id(entity) {
    if (!ids.has(entity)) ids.set(entity, nextId++);
    return ids.get(entity);
  }

  function force(entity, neighbors) {
    const external = neighbors.filter(other => other !== entity);
    const steering = entity.separate(external);
    for (const other of external) {
      if (p5.Vector.dist(entity.pos, other.pos) > 1e-6) continue;
      const direction = id(entity) < id(other) ? -1 : 1;
      const desired = createVector(direction * entity.maxSpeed, 0);
      steering.add(desired.sub(entity.vel).limit(entity.maxForce));
    }
    return steering.limit(entity.maxForce);
  }
  return { force };
})();
