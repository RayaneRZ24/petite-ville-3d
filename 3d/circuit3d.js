// Géométrie du chemin ; les agents y réagissent par steering, sans trajectoire imposée.
class Circuit3D {
  constructor(count = 64) {
    this.points = [];
    this.radius = 4.2;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      this.points.push(new YUKA.Vector3(
        25 * Math.cos(angle) * (1 + .08 * Math.sin(angle * 3)),
        0,
        18 * Math.sin(angle) * (1 + .12 * Math.cos(angle * 2)),
      ));
    }
  }

  createPath(start = 0, height = 0) {
    const path = new YUKA.Path();
    path.loop = true;
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[(start + i) % this.points.length].clone();
      point.y = height;
      path.add(point);
    }
    return path;
  }

  spawn(index) {
    const point = this.points[index % this.points.length].clone();
    const next = this.points[(index + 1) % this.points.length];
    return { point, direction: new YUKA.Vector3().subVectors(next, point).normalize(), index };
  }

  frameAt(position) {
    let bestDistance = Infinity, best;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i], b = this.points[(i + 1) % this.points.length];
      const dx = b.x - a.x, dz = b.z - a.z;
      const fraction = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz)));
      const x = a.x + dx * fraction, z = a.z + dz * fraction;
      const distance = (position.x - x) ** 2 + (position.z - z) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, z, dx, dz, index: i };
      }
    }
    const direction = new YUKA.Vector3(best.dx, 0, best.dz).normalize();
    return { point: new YUKA.Vector3(best.x, 0, best.z), direction,
      normal: new YUKA.Vector3(direction.z, 0, -direction.x), index: best.index };
  }

  alignPath(path, position, velocity) {
    const predicted = position.clone().add(velocity.clone().multiplyScalar(.35));
    const frame = this.frameAt(predicted);
    if (!Number.isInteger(frame.index)) return;
    const next = this.points[(frame.index + 1) % this.points.length];
    // Yuka 0.7.8 n'expose pas de setter de curseur. Le chemin reste propre à l'agent.
    const index = path._waypoints.findIndex(point => point.equals(next));
    if (index >= 0) path._index = index;
  }
}
