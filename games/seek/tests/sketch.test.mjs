import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Adaptateur de vecteurs ; le steering testé reste celui du vrai Vehicle.
class Vector {
  constructor(x = 0, y = 0) { this.set(x, y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  mult(n) { this.x *= n; this.y *= n; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(n) { const m = this.mag(); return m ? this.mult(n / m) : this; }
  limit(n) { return this.mag() > n ? this.setMag(n) : this; }
  static sub(a, b) { return new Vector(a.x - b.x, a.y - b.y); }
}

function scene() {
  const nodes = new Map();
  const sliders = [];
  const canvasEvents = {};
  const renderCalls = [];
  const document = { addEventListener() {}, getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, { value: id === 'scenario-select' ? 'pursuit' : '',
      hidden: id === 'endurance-controls', offsetHeight: 80, events: {},
      selectedOptions: [{ textContent: 'Scénario' }],
      addEventListener(name, fn) { this.events[name] = fn; } });
    return nodes.get(id);
  } };
  const context = vm.createContext({
    document: Object.assign(document,{body:{classList:{toggle(){}}}}), width: 800, height: 520, windowWidth: 800, windowHeight: 520,
    Math: Object.assign(Object.create(Math), { random: () => 0.1 }),
    createVector: (x, y) => new Vector(x, y), p5: { Vector },
    createSlider(min, max, initial, step) {
      const slider = { min, max, current: initial, step,
        value() { return this.current; },
        parent(id) { this.parentId = id; }, id(id) { this.idValue = id; },
        input(fn) { this.onInput = fn; } };
      sliders.push(slider); return slider;
    },
    createCanvas(w, h) {
      context.width = w; context.height = h;
      return { parent() {}, elt: {
        addEventListener(name, fn) { canvasEvents[name] = fn; },
        getBoundingClientRect: () => ({ left: 0, top: 80, width: w, height: h }),
      } };
    },
    drawingContext: {}, millis: () => 1200,
    HypnoticBackground: { draw() {} },
    bindHypnoticAudio: () => ({ playing: false, setModulation(rateHz, depthHz) { this.fm = { rateHz, depthHz }; } }),
    bindMissileAudio: () => ({ disable(){}, alarm(){}, decoys(){}, startEscape(){}, stopEscape(){}, explosion(){} }),
    bindCaptureAudio: () => ({ calls: 0, capture() { this.calls++; } }),
    bindSettingsPanel: () => {}, CENTER: 'center',
    resizeCanvas(w, h) { context.width = w; context.height = h; },
    constrain: (value, min, max) => Math.max(min, Math.min(max, value)),
  });
  for (const name of ['push', 'pop', 'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight', 'circle', 'rect', 'text', 'textSize', 'textAlign']) {
    context[name] = (...args) => renderCalls.push([name, ...args]);
  }
  for (const file of ['vehicle.js', 'population.js', 'fleeBehavior.js', 'follower.js', 'targetAvoidance.js',
    'targetMotion.js', 'target.js', 'fleeingTargetBehavior.js', 'targetFutante.js', 'targetPopulation.js', 'scenarios.js',
    'arrivalRules.js', 'frequencyModulation.js', 'sketch.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  }
  vm.runInContext('setup(); Vehicle.prototype.show = () => {}; for (const v of vehicles) v.pos.set(700, 400);', context);
  return { nodes, sliders, canvasEvents, renderCalls, run: code => vm.runInContext(code, context) };
}

test('setup : sliders p5 configurés, population initiale et compteurs', () => {
  const s = scene();
  assert.deepEqual(s.sliders.map(v => [v.min, v.max, v.current, v.step]),
    [[1, 20, 10, 1], [0.01, 2, 0.1, 0.01], [0, 2, 0.35, 0.01], [0, 1, 0.75, 0.01],
      [50, 290, 200, 10], [0.5, 10, 3, 0.1], [0,300,100,10], [0.2,10,2,0.1]]);
  assert.deepEqual(s.sliders.map(v => [v.idValue, v.parentId]),
    [['max-speed', 'max-speed-control'], ['max-force', 'max-force-control'],
      ['gradient-speed', 'gradient-speed-control'], ['gradient-intensity', 'gradient-intensity-control'],
      ['detection-radius', 'detection-control'], ['endurance-duration', 'endurance-control'], ['decoy-capacity','decoy-capacity-control'], ['decoy-lifetime','decoy-lifetime-control']]);
  assert.equal(s.run('vehicles.length'), 20);
  assert.equal(s.run('vehicles.every(v => v.maxSpeed === 10 && v.maxForce === 0.1)'), true);
  assert.equal(s.nodes.get('max-speed-value').value, 10);
  assert.equal(s.nodes.get('max-force-value').value, '0.10');
});

test('creerVehicules : effectif, conservation, nouveaux réglages et valeurs invalides', () => {
  const s = scene();
  s.run('globalThis.first = vehicles[0]; first.vel.set(2, 1);');
  s.sliders[0].current = 7; s.sliders[1].current = 0.35;
  s.sliders[1].onInput();
  s.run('creerVehicules(200)');
  assert.equal(s.run('vehicles.length'), 200);
  assert.equal(s.run('vehicles.every(v => v.maxSpeed === 7 && v.maxForce === 0.35)'), true);
  s.run('creerVehicules(1)');
  assert.equal(s.run('vehicles[0] === first && first.vel.x === 2 && first.vel.y === 1'), true);
  assert.equal(s.nodes.get('vehicle-count').value, 1);
  assert.equal(s.nodes.get('vehicle-count-value').value, '1 / 200');
  for (const value of ['0', '201', '1.5', 'NaN']) {
    assert.throws(() => s.run(`creerVehicules(${value})`), { name: 'RangeError' });
  }
  const count = s.nodes.get('vehicle-count');
  count.value = '35'; count.events.input();
  assert.equal(s.run('vehicles.length'), 35);
});

test('sliders : valeurs extrêmes, steering et locomotion avec les réglages courants', () => {
  const s = scene();
  for (const [speed, force] of [[1, 0.01], [20, 2], [7, 0.35]]) {
    s.sliders[0].current = speed; s.sliders[0].onInput();
    s.sliders[1].current = force; s.sliders[1].onInput();
    assert.equal(s.nodes.get('max-force-value').value, force.toFixed(2));
    for (const distance of [0, 0.001, 1000]) {
      s.run(`vehicles[0].pos.set(100, 100); vehicles[0].vel.set(0, 0);
        globalThis.f = vehicles[0].seek(createVector(100 + ${distance}, 100));`);
      assert.ok(s.run('f.mag()') <= force + 1e-12);
      assert.ok(Math.abs(s.run('f.x') - (distance ? Math.min(speed, force) : 0)) < 1e-12);
    }
    s.run('vehicles[0].vel.set(100, 0); vehicles[0].applyBehaviors(target.pos); vehicles[0].update();');
    assert.ok(s.run('vehicles[0].vel.mag()') <= speed + 1e-12);
    assert.equal(s.run('vehicles[0].acc.mag()'), 0);
  }
});

test('draw : tous les véhicules suivent la cible et traversent le bord opposé', () => {
  const s = scene();
  s.run('creerVehicules(2); vehicles[0].pos.set(815, 100); vehicles[0].vel.set(4, 0); vehicles[1].pos.set(100, 100);');
  const previous = s.run('vehicles[1].pos.x');
  s.run('draw()');
  assert.equal(s.run('vehicles[0].pos.x'), -16);
  assert.ok(s.run('vehicles[1].pos.x') > previous);
  const position = s.run('[target.pos.x, target.pos.y].join(",")');
  s.sliders[0].current = 5; s.sliders[0].onInput();
  assert.equal(s.run('[target.pos.x, target.pos.y].join(",")'), position);
});

test('décor avant les entités, temps en secondes et pointeur relatif au canvas', () => {
  const s = scene();
  s.run(`globalThis.calls = [];
    HypnoticBackground.draw = (ctx, w, h, time) => calls.push('fond:' + w + ':' + h + ':' + time);
    Vehicle.prototype.show = () => calls.push('véhicule');
    Target.prototype.show = () => calls.push('curseur'); draw();`);
  assert.equal(s.run('calls[0]'), 'fond:800:520:0');
  assert.equal(s.run('calls.filter(c => c === "véhicule").length'), 20);
  assert.equal(s.run('calls[calls.length - 1]'), 'curseur');
  const beforePointer = s.run('[target.pos.x, target.pos.y].join(",")');
  s.canvasEvents.pointermove({ clientX: 125, clientY: 180 });
  assert.equal(s.run('[target.pos.x, target.pos.y].join(",")'), beforePointer);
  assert.equal(s.run('mousePosition.x'), 125);
  assert.equal(s.run('mousePosition.y'), 100);
  s.sliders[1].current = 2; s.sliders[1].onInput();
  assert.equal(s.run('[target.pos.x, target.pos.y].join(",")'), beforePointer);
  assert.equal(s.run('vehicles.every(v => v.maxForce === 2)'), true);
});

test('dégradé : vitesse continue, pause, intensité et centre indépendants du steering', () => {
  const s = scene();
  s.run(`HypnoticBackground.draw = (ctx, w, h, time, options) => {
    globalThis.gradientFrame = { time, x: options.center.x, y: options.center.y, intensity: options.intensity };
  }; millis = () => 2200; draw();`);
  assert.ok(Math.abs(s.run('gradientFrame.time') - 0.35) < 1e-12);
  s.sliders[2].current = 0; s.sliders[2].onInput();
  s.run('millis = () => 3200; draw();');
  assert.ok(Math.abs(s.run('gradientFrame.time') - 0.35) < 1e-12);
  s.sliders[2].current = 2; s.sliders[2].onInput();
  s.sliders[3].current = 1; s.sliders[3].onInput();
  s.canvasEvents.pointermove({ clientX: 125, clientY: 180 });
  s.run('millis = () => 4200; draw();');
  assert.ok(Math.abs(s.run('gradientFrame.time') - 2.35) < 1e-12);
  assert.ok(Math.abs(s.run('gradientFrame.x') - 125) <= 520 * 0.18);
  assert.ok(Math.abs(s.run('gradientFrame.y') - 100) <= 520 * 0.18 * 0.65);
  assert.notEqual(s.run('target.pos.x'), 125); assert.notEqual(s.run('target.pos.y'), 100);
  assert.equal(s.run('gradientFrame.intensity'), 1);
  assert.equal(s.nodes.get('gradient-speed-value').value, '2.00');
  assert.equal(s.nodes.get('gradient-intensity-value').value, '1.00');
  assert.equal(s.run('vehicles.every(v => v.maxSpeed === 10 && v.maxForce === 0.1)'), true);
  s.sliders[3].current = 0; s.sliders[3].onInput();
  s.run('draw()'); assert.equal(s.run('gradientFrame.intensity'), 0);
});

test('souris : FM audio et centre du fond partagent les paramètres, cible indépendante', () => {
  const s = scene();
  s.canvasEvents.pointermove({ clientX: 600, clientY: 210 });
  assert.equal(s.run('hypnoticMusic.fm.rateHz'), 9.0625);
  assert.equal(s.run('hypnoticMusic.fm.depthHz'), 60);
  assert.equal(s.nodes.get('fm-depth-value').textContent, '60.0 Hz');
  s.run('millis = () => 1700; draw();');
  const first = s.run('[gradientCenter.x, gradientCenter.y].join(",")');
  s.run('millis = () => 2200; draw();');
  assert.notEqual(s.run('[gradientCenter.x, gradientCenter.y].join(",")'), first);
  assert.notEqual(s.run('target.pos.x'), 600); assert.notEqual(s.run('target.pos.y'), 130);
  assert.equal(s.run('hypnoticMusic.playing'), false);
  // En bas : profondeur nulle, plus aucun déplacement du centre autour du pointeur.
  s.canvasEvents.pointermove({ clientX: 600, clientY: 600 });
  s.run('millis = () => 2700; draw();');
  assert.equal(s.run('hypnoticMusic.fm.depthHz'), 0);
  assert.equal(s.run('gradientCenter.x'), 600); assert.equal(s.run('gradientCenter.y'), 520);
  s.sliders[1].current = 0.5; s.sliders[1].onInput();
  assert.equal(s.run('hypnoticMusic.fm.depthHz'), 0);
  assert.equal(s.run('vehicles.every(v => v.maxForce === 0.5)'), true);
});

test('cible autonome : visible et mobile dès le départ, indépendante de la souris et des sliders', () => {
  const s = scene();
  s.run('draw()');
  const initial = s.run('[target.pos.x, target.pos.y]');
  assert.ok(Math.hypot(initial[0] - 400, initial[1] - 260) > 0);
  assert.deepEqual(s.renderCalls.find(c => c[0] === 'circle' && c[3] === 28), ['circle', ...initial, 28]);
  s.renderCalls.length = 0;
  s.canvasEvents.pointermove({ clientX: 125, clientY: 180 });
  s.run('draw()');
  const second = s.run('[target.pos.x, target.pos.y]');
  assert.notDeepEqual(Array.from(second), Array.from(initial));
  assert.deepEqual(s.renderCalls.find(c => c[0] === 'circle' && c[3] === 28), ['circle', ...second, 28]);
  s.renderCalls.length = 0;
  // Une position extérieure ne remplace pas la dernière position valide.
  s.canvasEvents.pointermove({ clientX: 900, clientY: 180 });
  s.sliders[0].current = 20; s.sliders[0].onInput();
  s.run('draw(); draw();');
  const circles = s.renderCalls.filter(c => c[0] === 'circle' && c[3] === 28);
  assert.equal(circles.length, 2);
  assert.notDeepEqual(circles[0], circles[1]);
  assert.ok(circles.every(c => c[1] !== 125 && c[1] !== 900));
  assert.equal(s.run('target.r'), 16);
});

test('redimensionnement : canvas adapté, cible bornée et population préservée', () => {
  const s = scene();
  s.run(`globalThis.first = vehicles[0]; first.vel.set(2, 1);
    windowWidth = 300; windowHeight = 400; target.pos.set(700, 500); windowResized();`);
  assert.equal(s.run('width'), 300); assert.equal(s.run('height'), 400);
  assert.equal(s.run('target.pos.x'), 300); assert.equal(s.run('target.pos.y'), 400);
  assert.equal(s.run('vehicles[0] === first && first.vel.x === 2 && first.vel.y === 1'), true);
  assert.equal(s.run('vehicles.length'), 20);
});

test('cible : fuit la flèche proche, souris conservée pour FM et cercle visible', () => {
  const s = scene();
  s.run('document.getElementById("scenario-select").value="endurance"; changerScenario(); keyPressed({key:"d"});');
  s.run('creerVehicules(1); target.vel.set(0, 0); vehicles[0].pos.set(440, 260); draw();');
  assert.equal(s.run('target.isFleeing'), true);
  assert.ok(s.run('target.pos.x') < 400);
  assert.equal(s.run('target.pos.y'), 260);
  assert.ok(s.renderCalls.some(c => c[0] === 'circle' && c[3] === 400));
  const position = s.run('[target.pos.x,target.pos.y].join(",")');
  s.canvasEvents.pointermove({ clientX: 600, clientY: 210 });
  assert.equal(s.run('[target.pos.x,target.pos.y].join(",")'), position);
  assert.equal(s.run('mousePosition.x'), 600); assert.equal(s.run('mousePosition.y'), 130);
  assert.equal(s.run('hypnoticMusic.fm.rateHz'), 9.0625);
  assert.equal(s.run('hypnoticMusic.fm.depthHz'), 60);
  s.run('vehicles[0].pos.set(700, 400); draw();');
  assert.equal(s.run('target.isFleeing'), false);
  const safePosition = s.run('[target.pos.x,target.pos.y].join(",")');
  s.canvasEvents.pointermove({ clientX: 200, clientY: 180 });
  assert.equal(s.run('[target.pos.x,target.pos.y].join(",")'), safePosition);
  assert.ok(s.run('target.vel.mag()') > 0);
});

test('cible : vitesse de fuite adaptée aux sliders, locomotion exécutée une seule fois', () => {
  const s = scene();
  s.run('document.getElementById("scenario-select").value="endurance"; changerScenario();');
  for (const [speed, force] of [[1, 0.01], [20, 2]]) {
    s.sliders[0].current = speed; s.sliders[1].current = force; s.sliders[1].onInput();
    assert.ok(s.run('target.maxSpeed') > speed);
    assert.ok(s.run('target.maxForce') >= force);
  }
  s.run(`globalThis.updates = 0; const inheritedUpdate = target.update;
    target.update = function() { updates++; inheritedUpdate.call(this); }; draw();`);
  assert.equal(s.run('updates'), 1);
});

test('scénarios : modes cohérents, population conservée, variantes précédentes accessibles', () => {
  const s = scene();
  const scenario = s.nodes.get('scenario-select');
  scenario.value = 'flee'; scenario.events.change();
  assert.equal(s.run('vehicles.every(v => v.behavior === "flee")'), true);
  s.run('creerVehicules(35)');
  assert.equal(s.run('vehicles.every(v => v.behavior === "flee")'), true);
  scenario.value = 'targetRespawn'; scenario.events.change();
  assert.equal(s.run('target.protected'), false);
  s.run('creerVehicules(1); vehicles[0].pos.set(target.pos.x, target.pos.y); vehicles[0].maxForce = 0;');
  const original = s.run('[target.pos.x, target.pos.y]');
  s.run('draw()');
  assert.ok(s.run('Math.hypot(target.pos.x - 400, target.pos.y - 260)') > 20);
  assert.deepEqual(Array.from(s.run('[vehicles[0].pos.x, vehicles[0].pos.y]')), Array.from(original));
  scenario.value = 'endurance'; scenario.events.change();
  assert.equal(s.run('target instanceof TargetFuyante'), true);
  assert.equal(s.nodes.get('endurance-controls').hidden, false);
  scenario.value = 'pursuit'; scenario.events.change();
  assert.equal(s.run('target instanceof TargetFuyante'), false);
  assert.equal(s.run('target.protected'), false);
  assert.equal(s.nodes.get('endurance-controls').hidden, true);
});

test('endurance UI : sliders appliqués sans reset, réglages conservés en changeant de scénario', () => {
  const s = scene();
  const selector = s.nodes.get('scenario-select');
  s.run('globalThis.firstVehicle = vehicles[0];');
  selector.value = 'endurance'; selector.events.change();
  s.run('target.staminaSeconds = 1.5; target.state = "fleeing";');
  s.sliders[4].current = 250; s.sliders[4].onInput();
  assert.equal(s.run('target.detectionRadius'), 250);
  assert.equal(s.run('target.staminaSeconds'), 1.5);
  s.sliders[5].current = 4; s.sliders[5].onInput();
  assert.equal(s.run('target.maxFleeSeconds'), 4);
  assert.equal(s.run('target.staminaSeconds'), 2.5);
  assert.equal(s.nodes.get('detection-value').value, '250 px');
  assert.equal(s.nodes.get('endurance-value').value, '4.0 s');
  const position = s.run('[target.pos.x,target.pos.y].join()');
  selector.value = 'pursuit'; selector.events.change();
  s.run('millis = () => 5000;');
  selector.value = 'endurance'; selector.events.change();
  assert.equal(s.run('previousFrameSeconds'), 5);
  assert.equal(s.run('[target.pos.x,target.pos.y].join()'), position);
  assert.equal(s.run('vehicles[0] === firstVehicle && vehicles.length === 20'), true);
  assert.equal(s.run('target.detectionRadius'), 250);
  assert.equal(s.run('target.staminaSeconds'), 4);
  assert.equal(s.run('target.state'), 'normal');
});

test('draw : durée réelle transmise à la cible, duplication et récupération à 3 secondes', () => {
  const s = scene();
  s.run('document.getElementById("scenario-select").value="endurance"; changerScenario(); creerVehicules(1); target.vel.set(0,0); vehicles[0].pos.set(500,260);');
  s.run('millis = () => 2700; draw();');
  assert.ok(Math.abs(s.run('target.staminaSeconds') - 1.5) < 1e-12);
  assert.equal(s.run('target.isFleeing'), true);
  s.run('millis = () => 4200; draw();');
  assert.equal(s.run('target.staminaSeconds'), 0);
  assert.equal(s.run('target.state'), 'recovering');
  assert.equal(s.run('target.isFleeing'), false);
  assert.equal(s.run('targets.length'), 2);
});

test('debug D : affichage seul, répétition et saisie ignorées, cercle réservé au scénario 2', () => {
  const s = scene();
  s.run('document.getElementById("scenario-select").value="endurance"; changerScenario();');
  const before = s.run('JSON.stringify(target)');
  s.run('keyPressed({key:"d"});');
  assert.equal(s.run('debugMode'), true);
  assert.equal(s.nodes.get('debug-state').textContent, 'activé');
  assert.equal(s.run('JSON.stringify(target)'), before);
  s.run('keyPressed({key:"d",repeat:true}); keyPressed({key:"d",ctrlKey:true}); keyPressed({key:"x"});');
  assert.equal(s.run('debugMode'), true);
  s.run('document.activeElement={tagName:"INPUT",type:"text"}; keyPressed({key:"d"});');
  assert.equal(s.run('debugMode'), true);
  s.run('document.activeElement=null; keyPressed({key:"D"});');
  assert.equal(s.run('debugMode'), false);
  assert.equal(s.run('JSON.stringify(target)'), before);
  s.run('keyPressed({key:"d"}); document.getElementById("scenario-select").value="pursuit"; changerScenario(); draw();');
  assert.equal(s.renderCalls.some(c => c[0] === 'circle' && c[3] > 50), false);
  assert.ok(s.renderCalls.some(c => c[0] === 'circle' && c[3] === 50));
});

test('fuite : contact du cercle, réaction immédiate et absence de contact avec le point rouge', () => {
  for (const speed of [1, 10, 20]) {
    for (const force of [0.01, 2]) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.6, 0.8]]) {
        const s = scene();
        s.run('document.getElementById("scenario-select").value="endurance"; changerScenario();');
        s.sliders[0].current = speed; s.sliders[1].current = force; s.sliders[1].onInput();
        // Position loin des bords ; locomotion réelle sans wrap pour cette poursuite.
        s.run(`creerVehicules(1); target.pos.set(10000, 10000); target.vel.set(0, 0);
          vehicles[0].pos.set(10000 + ${dx} * 200, 10000 + ${dy} * 200);
          vehicles[0].vel.set(-(${dx}) * ${speed}, -(${dy}) * ${speed});
          target.applyAvoidance(vehicles);`);
        assert.equal(s.run('target.isFleeing'), true);
        assert.ok(s.run(`target.acc.x * ${dx} + target.acc.y * ${dy}`) < 0);
        for (let frame = 0; frame < 120; frame++) {
          // La première force a déjà été appliquée lors du contrôle du déclenchement.
          if (frame > 0) s.run('target.applyAvoidance(vehicles);');
          s.run(`target.update(); vehicles[0].applyBehaviors(target.pos); vehicles[0].update();`);
          const separation = s.run('Math.hypot(target.pos.x - vehicles[0].pos.x, target.pos.y - vehicles[0].pos.y)');
          assert.ok(separation > 14 + 16,
            `Collision : vitesse=${speed}, force=${force}, direction=${dx},${dy}, image=${frame}`);
          assert.ok(s.run('target.vel.mag() <= target.maxSpeed + 1e-10'));
        }
      }
    }
  }
});
