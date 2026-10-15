// Même organisation que le Snake du professeur : tête distincte et tableau d'anneaux.
class Snake3D extends YUKA.Vehicle {
  constructor(spawn, path, id, obstacles = []) {
    super();
    this.ownerId = id;
    this.head = new SnakeHead3D(spawn.point, spawn.direction, path, obstacles);
    this.anneaux = [this.head];
    for (let i = 1; i < 9; i++) this.anneaux.push(new SnakeSegment3D(this.anneaux[i - 1], 1.1, obstacles));
    for (const segment of this.anneaux) segment.ownerId = id;
    this.setWeights(2, 2.5, .5);
  }

  setWeights(follow, separation, wander) {
    if (![follow, separation, wander].every(value => Number.isFinite(value) && value >= 0 && value <= 5)) {
      throw new RangeError('Les poids doivent être compris entre 0 et 5.');
    }
    this.weights = { follow, separation, wander };
    this.head.setWeights(follow, separation, wander);
    for (const segment of this.anneaux.slice(1)) segment.separation.weight = separation * 12;
  }
}
