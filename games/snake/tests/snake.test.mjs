import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector(this.x, this.y); }
  add(v, y) { this.x += typeof v === 'number' ? v : v.x; this.y += typeof v === 'number' ? y : v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  div(n) { return this.mult(1 / n); }
  mag() { return Math.hypot(this.x, this.y); }
  normalize() { return this.mag() ? this.div(this.mag()) : this; }
  setMag(n) { return this.normalize().mult(n); }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  heading() { return Math.atan2(this.y, this.x); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  static sub(a, b) { return a.copy().sub(b); }
  static add(a, b) { return a.copy().add(b); }
  static dist(a, b) { return Vector.sub(a, b).mag(); }
  static lerp(a, b, n) { return new Vector(a.x + (b.x - a.x) * n, a.y + (b.y - a.y) * n); }
}

function scene(withSketch = false) {
  const sliders = [], nodes = new Map(), drawing = [];
  const document = { activeElement: null, getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {});
    return nodes.get(id);
  } };
  const context = vm.createContext({ width: 1200, height: 800, windowWidth: 1200, windowHeight: 800,
    createVector: (x, y) => new Vector(x, y), p5: { Vector }, document,
    random: (a = 1, b) => b === undefined ? a * .5 : (a + b) / 2,
    PI: Math.PI, TWO_PI: Math.PI * 2, frameCount: 0, sin: Math.sin, cos: Math.cos,
    min: Math.min, max: Math.max, floor: Math.floor, ROUND: 'round', CLOSE: 'close',
    map: (value, a, b, c, d) => c + (value - a) / (b - a) * (d - c),
    color: value => value, lerpColor: a => a,
    createCanvas(w, h) { context.width = w; context.height = h; return { parent() {} }; },
    resizeCanvas(w, h) { context.width = w; context.height = h; },
    createSlider(min, max, value, step) {
      const slider = { min, max, current: value, step, value() { return this.current; },
        parent(id) { this.parentId = id; }, id(id) { this.idValue = id; }, input(fn) { this.onInput = fn; } };
      sliders.push(slider); return slider;
    },
    mouseX: 100, mouseY: 200,
  });
  for (const name of ['push', 'pop', 'stroke', 'fill', 'strokeWeight', 'translate', 'rotate', 'ellipse',
    'circle', 'line', 'noStroke', 'noFill', 'strokeJoin', 'beginShape', 'endShape', 'vertex', 'background']) {
    context[name] = (...args) => drawing.push([name, ...args]);
  }
  if (!withSketch) context.debug = false;
  const files = ['vehicle.js', 'path.js', 'snakeArrival.js', 'snakeRing.js', 'snake.js', 'snakeSeparation.js', 'pathSnake.js'];
  if (withSketch) files.push('sketch.js');
  for (const file of files) vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  const classes = vm.runInContext('({ Vehicle, Snake, SnakeRing, PathSnake, Path, SnakeArrival, SnakeSeparation })', context);
  return { ...classes, context, drawing, sliders, nodes, document, run: code => vm.runInContext(code, context) };
}

function rectangle(Path) {
  const path = new Path();
  for (const [x, y] of [[100, 100], [900, 100], [900, 600], [100, 600]]) path.addPoint(x, y);
  return path;
}

test('copie Snake : héritage, neuf anneaux et état vectoriel fini dès la création', () => {
  const { Vehicle, Snake, PathSnake, SnakeRing } = scene();
  const snake = new PathSnake(400, 300, new Vector(0, 1));
  assert.ok(snake instanceof Snake && snake instanceof Vehicle);
  assert.equal(snake.anneaux.length, 9); assert.equal(snake.anneaux[0], snake.head);
  assert.notEqual(snake.head, snake);
  assert.ok(snake.anneaux.every(r => r instanceof SnakeRing && r instanceof Vehicle));
  assert.ok(snake.anneaux.every(r => Number.isFinite(r.vel.mag()) && Number.isFinite(r.maxForce)));
  assert.equal(snake.head.follow, Vehicle.prototype.follow);
  assert.ok(snake.anneaux.every(r => r.update === Vehicle.prototype.update));
  assert.ok(snake.anneaux[1].pos.y < snake.head.pos.y);
});

test('follow hérité : correction hors de la route, aucune force dans son corridor', () => {
  const { PathSnake, Path } = scene(), path = rectangle(Path);
  const snake = new PathSnake(400, 220);
  const outside = snake.head.follow(path);
  assert.ok(outside.y < 0); assert.ok(outside.mag() <= snake.head.maxForce + 1e-12);
  snake.head.pos.set(400, 100);
  assert.equal(snake.head.follow(path).mag(), 0);
});

test('composition : somme pondérée bornée et aucun déplacement pendant le steering', () => {
  const { PathSnake, Vehicle, Path } = scene();
  const snake = new PathSnake(400, 220), neighbor = new Vehicle(410, 220, 3, .3), path = rectangle(Path);
  for (const [follow, separation, wander] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, .5], [2, 2.5, .5], [5, 5, 5]]) {
    snake.head.acc.set(0, 0); snake.setWeights(follow, separation, wander);
    // Le wander est calculé avant la limitation finale de la somme.
    const combined = snake.head.follow(path).mult(follow).add(snake.head.separate([neighbor]).mult(separation));
    if (wander) combined.add(snake.head.wander().mult(wander));
    combined.limit(snake.head.maxForce);
    const positions = snake.anneaux.map(r => [r.pos.x, r.pos.y]);
    snake.applyPathBehaviors([neighbor, ...snake.anneaux], path);
    assert.ok(Vector.dist(snake.head.acc, combined) < 1e-10);
    assert.equal(snake.acc.mag(), 0); // Le conteneur ne reçoit aucune force.
    assert.deepEqual(snake.anneaux.map(r => [r.pos.x, r.pos.y]), positions);
    assert.ok(snake.anneaux.every(r => r.acc.mag() <= r.maxForce + 1e-10));
    for (const ring of snake.anneaux) ring.acc.set(0, 0);
  }
});

test('séparation : tête et anneaux évitent les véhicules, ignorent les voisins éloignés', () => {
  const { PathSnake, Vehicle, Path } = scene();
  const path = rectangle(Path);
  for (const index of [0, 1, 5, 8]) {
    const a = new PathSnake(500, 300), b = new PathSnake(500, 300);
    a.setWeights(0, 0, 0); b.setWeights(0, 3, 0);
    for (const ring of [...a.anneaux, ...b.anneaux]) ring.vel.set(0, 0);
    const ring = b.anneaux[index], near = new Vehicle(ring.pos.x + 5, ring.pos.y, 3, .3);
    a.applyPathBehaviors([near], path); b.applyPathBehaviors([near], path);
    assert.ok(b.anneaux[index].acc.x < a.anneaux[index].acc.x);
    for (const r of b.anneaux) r.acc.set(0, 0);
    near.pos.set(10000, 10000);
    b.applyPathBehaviors([near], path);
    assert.ok(Vector.dist(a.anneaux[index].acc, b.anneaux[index].acc) < 1e-10);
  }
});

test('séparation : exclusion du corps propre et perception des anneaux des autres serpents', () => {
  const { PathSnake, Path } = scene();
  const a = new PathSnake(400, 300), b = new PathSnake(400, 300), path = rectangle(Path);
  a.setWeights(0, 3, 0); a.applyPathBehaviors(a.anneaux, path);
  assert.equal(a.head.acc.mag(), 0);
  for (const ring of a.anneaux) ring.acc.set(0, 0);
  b.anneaux[3].pos.set(405, 300);
  a.applyPathBehaviors([b.anneaux[3]], path); assert.ok(a.head.acc.x < 0);
});

test('positions confondues : repli fini et répulsions opposées', () => {
  const { Vehicle, SnakeSeparation } = scene();
  const a = new Vehicle(100, 100, 3, .3), b = new Vehicle(100, 100, 3, .3);
  a.vel.set(0, 0); b.vel.set(0, 0);
  const fa = SnakeSeparation.force(a, [a, b]), fb = SnakeSeparation.force(b, [b, a]);
  assert.ok(Number.isFinite(fa.mag()) && fa.mag() > 0); assert.ok(fa.x * fb.x < 0);
  assert.ok(fa.mag() <= a.maxForce && fb.mag() <= b.maxForce);
  assert.equal(SnakeSeparation.force(a, [a]).mag(), 0);
});

test('anneaux : arrival ralentit près du prédécesseur et freine à distance nulle', () => {
  const { SnakeRing } = scene();
  const ring = new SnakeRing(0, 0); ring.maxForce = 100; ring.vel.set(0, 0);
  assert.ok(ring.arrive(new Vector(1, 0)).mag() < ring.arrive(new Vector(100, 0)).mag());
  ring.vel.set(2, 0); assert.equal(ring.arrive(ring.pos).x, -2);
});

test('locomotion : un update hérité par anneau et vitesses bornées', () => {
  const { PathSnake, Path } = scene();
  const snake = new PathSnake(500, 300), path = rectangle(Path), counts = [];
  snake.anneaux.forEach((r, i) => {
    counts[i] = 0; const inherited = r.update;
    r.update = function() { counts[i]++; inherited.call(this); };
  });
  snake.applyPathBehaviors([], path); snake.advancePath();
  assert.deepEqual(counts, Array(9).fill(1));
  assert.ok(snake.anneaux.every(r => r.vel.mag() <= r.maxSpeed + 1e-10 && r.acc.mag() === 0));
});

test('suivi durable : le serpent avance autour du chemin fermé et le corps reste attaché', () => {
  const { PathSnake, Path } = scene();
  const snake = new PathSnake(300, 100), path = rectangle(Path);
  let maxGap = 0;
  for (let frame = 0; frame < 500; frame++) {
    snake.applyPathBehaviors([], path); snake.advancePath();
    for (let i = 1; i < snake.anneaux.length; i++) maxGap = Math.max(maxGap, Vector.dist(snake.anneaux[i].pos, snake.anneaux[i - 1].pos));
  }
  assert.ok(Vector.dist(snake.head.pos, new Vector(300, 100)) > 200);
  assert.ok(maxGap < snake.spacing * 2.5, `écart de chaîne : ${maxGap}`);
});

test('rendu : reprend le serpent d’Arrival sans changer son état', () => {
  const { PathSnake, drawing } = scene(); const snake = new PathSnake(500, 300);
  const snapshot = () => JSON.stringify(snake.anneaux.map(r => ({ pos: r.pos, vel: r.vel, acc: r.acc, path: r.path })));
  const before = snapshot(); snake.show();
  assert.equal(snapshot(), before);
  assert.equal(drawing.filter(c => c[0] === 'circle').length, 11);
  assert.ok(drawing.some(c => c[0] === 'circle' && c[1] === snake.head.pos.x && c[2] === snake.head.pos.y && c[3] === snake.r));
  assert.equal(drawing.some(c => c[0] === 'line'), false); // Rendu du professeur, sans langue du jeu personnalisé.
  assert.equal(snake.couleur, '#ffffff');
  assert.equal(drawing.filter(c => c[0] === 'fill' && c[1] === '#ffffff').length, 9);
  assert.ok(drawing.some(c => c[0] === 'fill' && c[1] === 0));
});

test('poids : bornes et valeurs invalides refusées', () => {
  const { PathSnake } = scene(); const snake = new PathSnake(0, 0);
  snake.setWeights(0, 5); assert.equal(snake.followWeight, 0); assert.equal(snake.separationWeight, 5);
  for (const weights of [[-1, 1], [1, 6], [NaN, 1], [1, Infinity], [1, 1, -1], [1, 1, 6], [1, 1, NaN]]) {
    assert.throws(() => snake.setWeights(...weights), { name: 'RangeError' });
  }
});

test('UI : sliders p5 appliqués à tous les serpents, y compris les nouveaux', () => {
  const s = scene(true); s.run('setup()');
  assert.deepEqual(s.sliders.map(r => [r.min, r.max, r.current, r.step]), [[0, 5, 2, .1], [0, 5, 2.5, .1], [0, 5, .5, .1]]);
  s.sliders[0].current = .5; s.sliders[1].current = 4; s.sliders[2].current = 1.2; s.sliders[2].onInput(); s.run('newSnake()');
  assert.equal(s.run('snakes.every(s => s.followWeight === .5 && s.separationWeight === 4 && s.wanderWeight === 1.2)'), true);
  assert.equal(s.nodes.get('snake-count').textContent, '2 serpents');
  assert.equal(s.nodes.get('follow-value').value, '0.5');
  assert.equal(s.nodes.get('wander-value').value, '1.2');
});

test('touche T : ajoute un serpent, ignore répétition et saisie ; D synchronise le debug', () => {
  const s = scene(true); s.run('setup(); keyPressed({key:"t"}); keyPressed({key:"T"});');
  assert.equal(s.run('snakes.length'), 3);
  s.run('keyPressed({key:"t",repeat:true}); keyPressed({key:"t",ctrlKey:true});');
  s.document.activeElement = { tagName: 'INPUT' }; s.run('keyPressed({key:"t"})');
  assert.equal(s.run('snakes.length'), 3);
  s.document.activeElement = null; s.run('keyPressed({key:"d"})');
  assert.equal(s.run('debug === true && Vehicle.debug === true'), true);
});

test('boucle : véhicules perçoivent tous les anneaux et aucune entité ne bouge deux fois', () => {
  const s = scene(true); s.run(`setup(); globalThis.updates = 0;
    const update = Vehicle.prototype.update;
    Vehicle.prototype.update = function() { updates++; update.call(this); };
    globalThis.seen = 0; vehicles[0].applyBehaviors = function(neighbors) { seen = neighbors.length; };
    draw();`);
  assert.equal(s.run('seen'), 24); assert.equal(s.run('updates'), 24);
  assert.ok(s.drawing.some(c => c[0] === 'background' && c[1] === '#df202b'));
  assert.ok(s.drawing.filter(c => c[0] === 'stroke').every(c => c[1] === 0));
  assert.equal(s.run('vehicles.every(v=>v.couleur==="#b8b8b8")'), true);
});

test('curseurs : glisser dessus ne crée aucun véhicule ; resize conserve les serpents', () => {
  const s = scene(true); s.run('setup()');
  s.context.sliderEvent = { target: { closest: () => ({}) } };
  s.run('mouseDragged(sliderEvent)'); assert.equal(s.run('vehicles.length'), 15);
  s.run('mouseDragged({}); windowWidth=600; windowHeight=500; windowResized();');
  assert.equal(s.run('vehicles.length'), 16); assert.equal(s.run('snakes.length'), 1);
  assert.equal(s.run('width'), 600); assert.equal(s.run('path.points.length'), 30);
});

test('wander : méthode héritée sur chaque tête, force pondérée et angle évolutif indépendant', () => {
  const s = scene(); const path = rectangle(s.Path);
  const a = new s.PathSnake(400, 100), b = new s.PathSnake(600, 100);
  a.setWeights(0, 0, .5); b.setWeights(0, 0, .5);
  assert.equal(a.head.wander, s.Vehicle.prototype.wander);
  assert.ok(a.head.displaceRange > 0);
  const initialAngle = a.head.wanderTheta;
  s.context.random = (min, max) => min + (max - min) * .7;
  const position = a.head.pos.copy();
  a.applyPathBehaviors([], path);
  assert.ok(Math.abs(a.head.acc.mag() - a.head.maxForce * .5) < 1e-12);
  assert.ok(Math.abs(a.head.wanderTheta - initialAngle - .1) < 1e-12);
  assert.equal(b.head.wanderTheta, initialAngle);
  assert.equal(Vector.dist(a.head.pos, position), 0);
  assert.ok(a.anneaux.slice(1).every(r => r.wanderTheta === initialAngle));
});

test('wander : cercle devant la tête en debug, aucune mutation ni appel avec un poids nul', () => {
  const s = scene(), snake = new s.PathSnake(400, 100), path = rectangle(s.Path);
  snake.setWeights(0, 0, .5); s.Vehicle.debug = true;
  snake.applyPathBehaviors([], path);
  assert.ok(s.drawing.some(c => c[0] === 'circle' && c[1] === 500 && c[2] === 100 && c[3] === 80));
  s.drawing.length = 0; snake.head.acc.set(0, 0);
  snake.setWeights(0, 0, 0);
  const angle = snake.head.wanderTheta;
  snake.head.wander = () => assert.fail('wander désactivé ne doit pas être appelé');
  snake.applyPathBehaviors([], path);
  assert.equal(snake.head.acc.mag(), 0); assert.equal(snake.head.wanderTheta, angle);
  assert.equal(s.drawing.some(c => c[0] === 'circle'), false);
});
