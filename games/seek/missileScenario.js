// Contrôleur de scène : perception, décisions, événements et collisions restent hors des entités.
class MissileScenario {
  constructor(w, h, options = {}) {
    this.rng = options.rng ?? Math.random;
    this.sound = options.sound ?? null;
    this.decoyCapacity = options.decoyCapacity ?? 100;
    this.decoyLifetime = options.decoyLifetime ?? 2;
    this.missile = new Missile(w * 0.12, h * 0.5);
    this.missile.vel.set(this.missile.maxSpeed, 0);
    this.targets = [];
    this.decoys = [];
    this.explosions = [];
    this.nowSeconds = 0;
    this.score = 0;
    const count = options.targetCount ?? 4;
    for (let i = 0; i < count; i++) {
      this.targets.push(new MissileTarget(w * (0.48 + 0.4 * this.rng()), h * (0.12 + 0.76 * this.rng()), this.rng, this.decoyCapacity));
    }
  }

  configure(capacity, lifetime) {
    if (!Number.isFinite(lifetime) || lifetime < 0.2 || lifetime > 10) {
      throw new RangeError('Durée de vie attendue : 0.2–10 s.');
    }
    this.decoyCapacity = capacity;
    this.decoyLifetime = lifetime;
    for (const target of this.targets) target.configureCapacity(capacity);
  }

  launchDecoys(target, count) {
    const created = [];
    const base = Math.atan2(target.vel.y, target.vel.x) + Math.PI;
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i / (count - 1) - 0.5) * Math.PI * 1.25;
      const angle = base + spread + (this.rng() - 0.5) * 0.16;
      const speed = 3.5 + this.rng() * 3;
      const velocity = createVector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      created.push(new Decoy(target.pos.x, target.pos.y, velocity, this.decoyLifetime));
    }
    this.decoys.push(...created);
    if (created.length) {
      this.missile.lockedSignal = created[Math.floor(this.rng() * created.length) % created.length];
      this.sound?.decoys(target, created.length);
    }
    return created;
  }

  chooseSignal() {
    if (this.missile.lockedSignal && (this.targets.includes(this.missile.lockedSignal)
      || this.decoys.includes(this.missile.lockedSignal))) return this.missile.lockedSignal;
    const signals = [...this.decoys, ...this.targets];
    let nearest = null, distance = Infinity;
    for (const signal of signals) {
      const value = (signal.pos.x - this.missile.pos.x) ** 2 + (signal.pos.y - this.missile.pos.y) ** 2;
      if (value < distance) { distance = value; nearest = signal; }
    }
    this.missile.lockedSignal = nearest;
    return nearest;
  }

  collides(entity) {
    return p5.Vector.sub(entity.pos, this.missile.pos).mag() <= entity.r + this.missile.r;
  }

  addExplosion(position) {
    this.explosions.push(new Explosion(position.x, position.y, 0.7));
    this.sound?.explosion(position);
  }

  respawnTarget(target, w, h) {
    const margin = 50;
    const x = margin + this.rng() * Math.max(0, w - margin * 2);
    const y = margin + this.rng() * Math.max(0, h - margin * 2);
    target.respawn(x, y);
  }

  step(elapsedSeconds, w, h) {
    const dt = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    this.nowSeconds += dt;
    for (const target of this.targets) {
      const previousState = target.state;
      const decision = target.decide(this.missile, dt, this.nowSeconds);
      if (decision.alarm) this.sound?.alarm(target);
      if (decision.releaseCount) this.launchDecoys(target, decision.releaseCount);
      if (previousState !== 'escaping' && target.state === 'escaping') this.sound?.startEscape(target);
      if (previousState === 'escaping' && target.state !== 'escaping') this.sound?.stopEscape(target);
      target.update();
      target.edges();
    }

    this.decoys = this.decoys.filter(decoy => {
      const expired = decoy.advance(dt);
      if (expired && this.missile.lockedSignal === decoy) this.missile.lockedSignal = null;
      return !expired;
    });
    const signal = this.chooseSignal();
    this.missile.applyGuidance(signal);
    this.missile.update();
    this.missile.edges();

    const struckDecoy = this.decoys.find(decoy => this.collides(decoy));
    if (struckDecoy) {
      this.addExplosion(struckDecoy.pos);
      this.decoys.splice(this.decoys.indexOf(struckDecoy), 1);
      this.missile.lockedSignal = null;
    } else {
      const struckTarget = this.targets.find(target => this.collides(target));
      if (struckTarget) {
        this.addExplosion(struckTarget.pos);
        this.sound?.stopEscape(struckTarget);
        this.respawnTarget(struckTarget, w, h);
        this.missile.lockedSignal = null;
        this.score++;
      }
    }
    this.explosions = this.explosions.filter(explosion => !explosion.advance(dt));
  }

  show(debug = false) {
    for (const decoy of this.decoys) decoy.show();
    for (const target of this.targets) target.show(debug);
    this.missile.show();
    for (const explosion of this.explosions) explosion.show();
  }

  dispose() {
    for (const target of this.targets) this.sound?.stopEscape(target);
  }
}
