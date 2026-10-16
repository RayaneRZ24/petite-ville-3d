let target;
const targets = [];
const vehicles = [];
let sceneCanvas;
let vitesseMaxSlider;
let forceMaxSlider;
let gradientSpeedSlider;
let gradientIntensitySlider;
let gradientTime = 0;
let previousFrameSeconds = 0;
let hypnoticMusic;
let fmSettings;
let modulationPhase = 0;
let gradientCenter;
let mousePosition;
let activeScenario = 'pursuit';
let detectionSlider;
let enduranceSlider;
let debugMode = false;
let captureSound;
let missileAudio;
let missileScene = null;
let savedVehicles = [];
let decoyCapacitySlider;
let decoyLifetimeSlider;

function synchroniserMissile() {
  const capacity = Number(decoyCapacitySlider.value());
  const lifetime = Number(decoyLifetimeSlider.value());
  missileScene?.configure(capacity, lifetime);
  document.getElementById('decoy-capacity-value').value = `${capacity} / cible`;
  document.getElementById('decoy-lifetime-value').value = `${lifetime.toFixed(1)} s`;
}

function synchroniserScenario() {
  const radius = Number(detectionSlider.value());
  const duration = Number(enduranceSlider.value());
  for (const entity of targets) if (entity instanceof TargetFuyante) entity.configure(radius, duration);
  document.getElementById('detection-value').value = `${radius} px`;
  document.getElementById('endurance-value').value = `${duration.toFixed(1)} s`;
}

function changerScenario() {
  const id = document.getElementById('scenario-select').value;
  const previous = target;
  const wasMissile = SeekScenarios.get(activeScenario).missile === true;
  const isMissile = SeekScenarios.get(id).missile === true;
  if (isMissile) {
    if (!wasMissile) savedVehicles = vehicles.slice();
    vehicles.length = 0;
    targets.length = 0;
    missileScene?.dispose();
    missileScene = new MissileScenario(width, height, {
      sound: missileAudio,
      decoyCapacity: Number(decoyCapacitySlider.value()),
      decoyLifetime: Number(decoyLifetimeSlider.value()),
    });
    target = missileScene.targets[0];
  } else {
    if (wasMissile) {
      missileScene?.dispose();
      missileScene = null;
      vehicles.splice(0, vehicles.length, ...savedVehicles);
    }
    target = SeekScenarios.createTarget(id, previous.pos.x, previous.pos.y);
    target.vel.set(previous.vel.x, previous.vel.y);
    targets.splice(0, targets.length, target);
  }
  activeScenario = id;
  previousFrameSeconds = millis() / 1000;
  document.getElementById('endurance-controls').hidden = !SeekScenarios.get(id).fleeing;
  document.getElementById('missile-controls').hidden = !isMissile;
  document.body?.classList.toggle('missile-mode', isMissile);
  document.getElementById('score-label').textContent = isMissile ? 'Cibles détruites' : 'Meilleur vaisseau';
  document.getElementById('score-unit').textContent = isMissile ? '' : ' XP';
  document.getElementById('scenario-name').textContent = document.getElementById('scenario-select').selectedOptions[0].textContent;
  if (isMissile) synchroniserMissile();
  else {
    synchroniserReglages();
    synchroniserScenario();
  }
  windowResized();
}

function keyPressed(event) {
  const pressed = event?.key ?? (typeof key === 'string' ? key : '');
  const element = document.activeElement;
  const editing = element?.isContentEditable || element?.tagName === 'TEXTAREA'
    || (element?.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(element.type));
  if (pressed.toLowerCase() === 'd' && !event?.repeat && !event?.ctrlKey && !event?.metaKey
    && !event?.altKey && !editing) {
    debugMode = !debugMode;
    document.getElementById('debug-state').textContent = debugMode ? 'activé' : 'désactivé';
  }
}

function synchroniserModulation() {
  fmSettings = FrequencyModulation.fromPointer(mousePosition, width, height);
  hypnoticMusic.setModulation(fmSettings.rateHz, fmSettings.depthHz);
  document.getElementById('fm-rate-value').textContent = `${fmSettings.rateHz.toFixed(2)} Hz`;
  document.getElementById('fm-depth-value').textContent = `${fmSettings.depthHz.toFixed(1)} Hz`;
}

function synchroniserDegrade() {
  document.getElementById('gradient-speed-value').value = Number(gradientSpeedSlider.value()).toFixed(2);
  document.getElementById('gradient-intensity-value').value = Number(gradientIntensitySlider.value()).toFixed(2);
}

// Ajuste l'effectif en réutilisant les véhicules déjà présents.
function creerVehicules(nb) {
  if (SeekScenarios.get(activeScenario).missile) return;
  SeekPopulation.resize(vehicles, nb, target.pos, width, height, (x, y) => new Follower(x, y));
  synchroniserReglages();
  document.getElementById('vehicle-count').value = vehicles.length;
  document.getElementById('vehicle-count-value').value = `${vehicles.length} / ${SeekPopulation.MAX_COUNT}`;
}

function synchroniserReglages() {
  const vitesseMax = Number(vitesseMaxSlider.value());
  const forceMax = Number(forceMaxSlider.value());
  if (SeekScenarios.get(activeScenario).missile) {
    document.getElementById('max-speed-value').value = vitesseMax;
    document.getElementById('max-force-value').value = forceMax.toFixed(2);
    return;
  }
  for (const vehicle of vehicles) {
    vehicle.maxSpeed = vitesseMax;
    vehicle.maxForce = forceMax;
    vehicle.behavior = SeekScenarios.get(activeScenario).behavior;
  }
  for (const entity of targets) {
    entity.maxSpeed = Math.max(4, vitesseMax * 1.6);
    // Accélérer assez vite même quand la force des poursuivants est très faible.
    entity.maxForce = Math.max(1.5, vitesseMax * 0.45, forceMax * 3);
    if (entity instanceof TargetFuyante) entity.fleeSpeed = entity.maxSpeed;
  }
  document.getElementById('max-speed-value').value = vitesseMax;
  document.getElementById('max-force-value').value = forceMax.toFixed(2);
}

function creerReglages() {
  vitesseMaxSlider = createSlider(1, 20, 10, 1);
  vitesseMaxSlider.parent('max-speed-control');
  vitesseMaxSlider.id('max-speed');
  vitesseMaxSlider.input(synchroniserReglages);

  forceMaxSlider = createSlider(0.01, 2, 0.1, 0.01);
  forceMaxSlider.parent('max-force-control');
  forceMaxSlider.id('max-force');
  forceMaxSlider.input(synchroniserReglages);

  gradientSpeedSlider = createSlider(0, 2, 0.35, 0.01);
  gradientSpeedSlider.parent('gradient-speed-control');
  gradientSpeedSlider.id('gradient-speed');
  gradientSpeedSlider.input(synchroniserDegrade);

  gradientIntensitySlider = createSlider(0, 1, 0.75, 0.01);
  gradientIntensitySlider.parent('gradient-intensity-control');
  gradientIntensitySlider.id('gradient-intensity');
  gradientIntensitySlider.input(synchroniserDegrade);
  synchroniserDegrade();

  detectionSlider = createSlider(50, 290, 200, 10);
  detectionSlider.parent('detection-control');
  detectionSlider.id('detection-radius');
  detectionSlider.input(synchroniserScenario);
  enduranceSlider = createSlider(0.5, 10, 3, 0.1);
  enduranceSlider.parent('endurance-control');
  enduranceSlider.id('endurance-duration');
  enduranceSlider.input(synchroniserScenario);

  decoyCapacitySlider = createSlider(0, 300, 100, 10);
  decoyCapacitySlider.parent('decoy-capacity-control');
  decoyCapacitySlider.id('decoy-capacity');
  decoyCapacitySlider.input(synchroniserMissile);
  decoyLifetimeSlider = createSlider(0.2, 10, 2, 0.1);
  decoyLifetimeSlider.parent('decoy-lifetime-control');
  decoyLifetimeSlider.id('decoy-lifetime');
  decoyLifetimeSlider.input(synchroniserMissile);
}

function sceneHeight() {
  return Math.max(1, windowHeight);
}

function setup() {
  creerReglages();
  hypnoticMusic = bindHypnoticAudio(document);
  captureSound = bindCaptureAudio(document);
  missileAudio = bindMissileAudio(document);
  bindSettingsPanel(document);
  sceneCanvas = createCanvas(windowWidth, sceneHeight());
  sceneCanvas.parent('scene');
  target = SeekScenarios.createTarget(activeScenario, width / 2, height / 2);
  targets.push(target);
  mousePosition = createVector(target.pos.x, target.pos.y);
  gradientCenter = createVector(target.pos.x, target.pos.y);
  synchroniserModulation();
  previousFrameSeconds = millis() / 1000;

  const slider = document.getElementById('vehicle-count');
  slider.addEventListener('input', () => creerVehicules(Number(slider.value)));
  creerVehicules(SeekPopulation.INITIAL_COUNT);
  synchroniserScenario();
  synchroniserMissile();
  document.getElementById('scenario-select').addEventListener('change', changerScenario);
  // Revenir d'un onglet masqué ne doit pas donner trois secondes de survie gratuites.
  document.addEventListener('visibilitychange', () => { previousFrameSeconds = millis() / 1000; });

  // Les coordonnées sont relatives au canvas, pas à la barre de contrôle.
  // Un événement sur le slider ne modifie donc jamais la cible.
  sceneCanvas.elt.addEventListener('pointermove', event => {
    const rect = sceneCanvas.elt.getBoundingClientRect();
    const x = (event.clientX - rect.left) * width / rect.width;
    const y = (event.clientY - rect.top) * height / rect.height;
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      mousePosition.set(x, y);
      synchroniserModulation();
    }
  });
}

function draw() {
  const seconds = millis() / 1000;
  const elapsed = Math.max(0, seconds - previousFrameSeconds);
  gradientTime += elapsed * Number(gradientSpeedSlider.value());
  modulationPhase = FrequencyModulation.advancePhase(modulationPhase, elapsed, fmSettings.rateHz);
  FrequencyModulation.animateCenter(gradientCenter, mousePosition, width, height, modulationPhase, fmSettings.depthHz);
  previousFrameSeconds = seconds;
  if (SeekScenarios.get(activeScenario).missile) {
    background(0);
    missileScene.step(elapsed, width, height);
    missileScene.show(debugMode);
    document.getElementById('target-count-value').textContent = `${missileScene.targets.length} réelles · ${missileScene.decoys.length} leurres`;
    document.getElementById('best-xp-value').textContent = missileScene.score;
    document.getElementById('missile-stock-value').textContent = missileScene.targets.map(t => t.decoysRemaining).join(' · ');
    return;
  }
  ArrivalRules.step(vehicles, targets, width, height, SeekScenarios.get(activeScenario).arrival,
    Math.random, elapsed, () => captureSound.capture());
  TargetPopulation.duplicateReady(targets);
  document.getElementById('target-count-value').textContent = `${targets.length} / ${TargetPopulation.MAX_TARGETS}`;
  document.getElementById('best-xp-value').textContent = Math.max(0, ...vehicles.map(v => v.xp));
  HypnoticBackground.draw(drawingContext, width, height, gradientTime, {
    center: gradientCenter,
    intensity: Number(gradientIntensitySlider.value()),
  });
  for (const vehicle of vehicles) {
    vehicle.show();
  }
  // Dessiné en dernier pour rester visible, même quand les flèches arrivent dessus.
  for (const entity of targets) entity.show(debugMode && SeekScenarios.get(activeScenario).fleeing, vehicles);
}

function windowResized() {
  resizeCanvas(windowWidth, sceneHeight());
  for (const entity of targets) entity.pos.set(constrain(entity.pos.x, 0, width), constrain(entity.pos.y, 0, height));
  mousePosition.set(constrain(mousePosition.x, 0, width), constrain(mousePosition.y, 0, height));
  synchroniserModulation();
  for (const vehicle of vehicles) vehicle.edges();
  if (missileScene) {
    missileScene.missile.edges();
    for (const entity of [...missileScene.targets, ...missileScene.decoys]) entity.edges();
  }
}
