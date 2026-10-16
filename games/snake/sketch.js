// Path Following (Complex Path)
// The Nature of Code
// The Coding Train / Daniel Shiffman
// https://youtu.be/LrnR6dc2IfM
// https://thecodingtrain.com/learning/nature-of-code/5.7-path-following.html

// Path Following: https://editor.p5js.org/codingtrain/sketches/dqM054vBV
// Complex Path: https://editor.p5js.org/codingtrain/sketches/2FFzvxwVt

// Crowd Path Following
// Via Reynolds: http://www.red3d.com/cwr/steer/CrowdPath.html

// Pour debug on/off affichage des lignes etc.
let debug = false;

// le chemin
let path;

// Tableau des véhicules
let vehicles = [];
const snakes = [];
let followSlider;
let separationSlider;
let wanderSlider;

function setup() {
  createCanvas(windowWidth, windowHeight).parent('scene');
  // la fonction suivante créer un chemin composé de plusieurs points
  newPath();

  // On crée n véhicules placés aléatoirement sur le canvas
  const nbVehicules = 15;

  for (let i = 0; i < nbVehicules; i++) {
    newVehicle(random(width), random(height));
  }
  followSlider = createSlider(0, 5, 2, 0.1);
  followSlider.parent('follow-control');
  followSlider.id('snake-follow');
  followSlider.input(synchroniserPoids);
  separationSlider = createSlider(0, 5, 2.5, 0.1);
  separationSlider.parent('separation-control');
  separationSlider.id('snake-separation');
  separationSlider.input(synchroniserPoids);
  wanderSlider = createSlider(0, 5, 0.5, 0.1);
  wanderSlider.parent('wander-control');
  wanderSlider.id('snake-wander');
  wanderSlider.input(synchroniserPoids);
  newSnake();
}

function draw() {
  background('#df202b');
  // Affichage du chemin
  path.display();

  const neighbors = [...vehicles, ...snakes.flatMap(snake => snake.anneaux)];
  for (const snake of snakes) snake.applyPathBehaviors(neighbors, path);
  for (let v of vehicles) {
    // On applique les comportements pour suivre le chemin
    // Comme on utilise ici plusieurs comportements, notamment un comportement qui 
    // dépend des autres véhicules, on passe en paramètre le tableau des véhicules 
    // et le chemin
    v.applyBehaviors(neighbors, path);
    // on a regroupé update, draw etc. dans une méthode run (update, borders, display, etc.)
  }
  for (const v of vehicles) v.run();
  for (const snake of snakes) {
    snake.advancePath();
    snake.show();
  }
}

function synchroniserPoids() {
  const follow = Number(followSlider.value());
  const separation = Number(separationSlider.value());
  const wander = Number(wanderSlider.value());
  for (const snake of snakes) snake.setWeights(follow, separation, wander);
  document.getElementById('follow-value').value = follow.toFixed(1);
  document.getElementById('separation-value').value = separation.toFixed(1);
  document.getElementById('wander-value').value = wander.toFixed(1);
}

function newSnake() {
  const index = floor(random(path.points.length));
  const a = path.points[index];
  const b = path.points[(index + 1) % path.points.length];
  const position = p5.Vector.lerp(a, b, random(0.15, 0.85));
  const snake = new PathSnake(position.x, position.y, p5.Vector.sub(b, a));
  snakes.push(snake);
  synchroniserPoids();
  document.getElementById('snake-count').textContent = `${snakes.length} serpent${snakes.length > 1 ? 's' : ''}`;
  return snake;
}

function newPath() {
  // Simple suite de points partant de 30, 30 et allant vers 30, height - 30 etc.
  path = new Path();
  
  /*
  let offset = 100;
  path.addPoint(offset, offset);
  path.addPoint(300, 180);
  path.addPoint(width - offset, offset);
  path.addPoint(width - offset, height - offset);
  path.addPoint(width / 2, height - offset * 3);
  path.addPoint(200,550);
  path.addPoint(offset, height - offset);
*/
  // genere un circuit qui ressemble à une piste de course
  // de voiture, sans angles trop durs
  // Je voudrais une trentaine de segments
  // Pas dangles trop aigus
  // et un peu d'aléatoire pour ne pas générer toujours le même circuit
  
  let offset = 100;
  let nbSegments = 30;
  let angleStep = (TWO_PI / nbSegments);
  let radiusMin = min(width, height) / 3;
  let radiusMax = min(width, height) / 2.5;

  for (let i = 0; i < nbSegments; i++) {
    let angle = i * angleStep;
    // un peu d'aléatoire sur le rayon
    let radius = random(radiusMin, radiusMax);
    let x = width / 2 + cos(angle) * radius;
    let y = height / 2 + sin(angle) * radius;
    path.addPoint(x, y);
  }
  
}

function newVehicle(x, y) {
  let maxspeed = random(1, 3);
  let maxforce = 0.3;
  let v = new Vehicle(x, y, maxspeed, maxforce);
  v.couleur = '#b8b8b8';
  vehicles.push(v);
  return v;
}

function keyPressed(event) {
  if (event?.repeat || event?.ctrlKey || event?.metaKey || event?.altKey) return;
  const element = document.activeElement;
  if (element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(element?.tagName)) return;
  const pressed = (event?.key ?? key).toLowerCase();
  if (pressed == "t") {
    newSnake();
  } else if (pressed == "d") {
    debug = !debug;
    Vehicle.debug = debug;
  } else if(pressed == "s") {
    let v = newVehicle(mouseX, mouseY);
    v.maxSpeed = 10;
    v.couleur = "red"
  } else if (pressed == "w") {
    // on cree un véhicule wander
    let v = new Vehicle(mouseX, mouseY, 2, 0.25);
    v.wanderWeight = 1;
    v.followPathWeight = 0;
    v.separateWeight = 0;
    v.r = 30;
    v.couleur = "lightgreen";
    vehicles.push(v);
  }
}

function mouseDragged(event) {
  if (event?.target?.closest?.('#controls')) return;
  newVehicle(mouseX, mouseY);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  newPath();
}
