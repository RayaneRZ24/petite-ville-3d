// Snake du professeur : tête indépendante dans head et corps dans anneaux.
class PathSnake extends Snake {
  constructor(x, y, direction = createVector(1, 0), couleur = '#ffffff') {
    super(x, y, 9, 22, couleur);
    this.spacing = 20;
    this.followWeight = 2;
    this.separationWeight = 2.5;
    this.wanderWeight = 0.5;
    // Une variation positive assure l'errance même si le tirage initial vaut zéro.
    this.head.displaceRange = 0.25;
    const tangent = direction.copy();
    if (tangent.mag() === 0) tangent.set(1, 0);
    tangent.normalize();
    // État initial de la chaîne, orientée comme le segment de naissance.
    for (let i = 0; i < this.anneaux.length; i++) {
      const ring = this.anneaux[i];
      ring.pos.set(x - tangent.x * this.spacing * i, y - tangent.y * this.spacing * i);
      ring.vel.set(tangent.x * this.head.maxSpeed, tangent.y * this.head.maxSpeed);
      ring.rayonZoneDeFreinage = this.spacing;
    }
  }

  setWeights(follow, separation, wander = this.wanderWeight) {
    if (![follow, separation, wander].every(weight => Number.isFinite(weight) && weight >= 0 && weight <= 5)) {
      throw new RangeError('Les poids doivent être compris entre 0 et 5.');
    }
    this.followWeight = follow;
    this.separationWeight = separation;
    this.wanderWeight = wander;
  }

  applyPathBehaviors(neighbors, path) {
    // Les anneaux du même serpent sont exclus pour conserver la chaîne.
    const own = new Set(this.anneaux);
    const external = neighbors.filter(other => !own.has(other));
    const headForce = this.head.follow(path).mult(this.followWeight);
    headForce.add(SnakeSeparation.force(this.head, external).mult(this.separationWeight));
    if (this.wanderWeight > 0) headForce.add(this.head.wander().mult(this.wanderWeight));
    this.head.applyForce(headForce.limit(this.head.maxForce));
    for (let i = 1; i < this.anneaux.length; i++) {
      const previous = this.anneaux[i - 1];
      const ring = this.anneaux[i];
      const direction = previous.vel.copy();
      if (direction.mag() < 0.05) direction.set(1, 0);
      const position = previous.pos.copy().sub(direction.setMag(this.spacing));
      const force = ring.arrive(position, ring.rayonZoneDeFreinage, previous.vel);
      force.add(SnakeSeparation.force(ring, external).mult(this.separationWeight));
      ring.applyForce(force.limit(ring.maxForce));
    }
  }

  advancePath() {
    // Aucune locomotion recopiée : exactement un update() hérité par anneau.
    for (const ring of this.anneaux) ring.update();
  }
}
