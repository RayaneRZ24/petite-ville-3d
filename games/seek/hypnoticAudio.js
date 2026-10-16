// Ambiance synthétisée localement avec Web Audio, indépendante du steering.
class HypnoticAudio {
  constructor(options = {}) {
    this.createContext = options.createContext ?? (() => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Audio non pris en charge par ce navigateur.');
      return new AudioContext();
    });
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
    this.clearTimer = options.clearTimer ?? (id => clearTimeout(id));
    this.context = null;
    this.volume = 0.35;
    this.playing = false;
    this.sources = [];
    this.nodes = [];
    this.suspendTimer = null;
    this.operation = 0;
    this.disposed = false;
    this.fm = FrequencyModulation.parameters(6.125, 40);
    this.carriers = [];
  }

  createGraph() {
    this.context = this.createContext();
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2800;
    this.filter.Q.value = 0.5;
    this.filter.connect(this.master);

    // Un écho discret donne de l'espace aux notes sans fichier audio externe.
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.65;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    this.filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.master);
    this.nodes.push(this.master, this.filter, delay, feedback);

    // FM réelle : un oscillateur module l'AudioParam frequency des notes.
    this.fmModulator = ctx.createOscillator();
    this.fmModulator.type = 'sine';
    this.fmModulator.frequency.value = this.fm.rateHz;
    this.fmDepth = ctx.createGain();
    this.fmDepth.gain.value = this.fm.depthHz;
    this.fmModulator.connect(this.fmDepth);
    this.sources.push(this.fmModulator);
    this.nodes.push(this.fmModulator, this.fmDepth);

    // Accord monté d'une octave ; les notes hautes ont un timbre plus lumineux.
    [220, 329.62, 440, 554.36, 659.26].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = index < 2 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - 2) * 3;
      this.fmDepth.connect(oscillator.frequency);
      this.carriers.push(oscillator);
      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(this.filter);

      const modulation = ctx.createOscillator();
      modulation.type = 'sine';
      modulation.frequency.value = 0.07 + index * 0.025;
      const depth = ctx.createGain();
      depth.gain.value = 0.015;
      modulation.connect(depth);
      depth.connect(gain.gain);
      this.sources.push(oscillator, modulation);
      this.nodes.push(oscillator, gain, modulation, depth);
    });
    for (const source of this.sources) source.start();
  }

  fadeTo(value) {
    const now = this.context.currentTime;
    const gain = this.master.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(value, now + 0.3);
  }

  async start() {
    if (this.disposed) throw new Error('Audio fermé.');
    const operation = ++this.operation;
    if (this.suspendTimer !== null) this.clearTimer(this.suspendTimer);
    this.suspendTimer = null;
    // Création et reprise dans le gestionnaire de clic, jamais au chargement.
    if (!this.context) this.createGraph();
    await this.context.resume();
    if (operation !== this.operation || this.disposed) return;
    this.playing = true;
    this.fadeTo(this.volume);
  }

  stop() {
    ++this.operation;
    this.playing = false;
    if (!this.context || this.disposed) return;
    this.fadeTo(0);
    if (this.suspendTimer !== null) this.clearTimer(this.suspendTimer);
    this.suspendTimer = this.setTimer(() => {
      this.suspendTimer = null;
      if (!this.playing && !this.disposed) this.context.suspend().catch(() => {});
    }, 350);
  }

  setVolume(value) {
    if (!Number.isFinite(value)) throw new RangeError('Volume invalide.');
    this.volume = Math.max(0, Math.min(1, value));
    if (this.playing) this.fadeTo(this.volume);
  }

  setModulation(rateHz, depthHz) {
    this.fm = FrequencyModulation.parameters(rateHz, depthHz);
    if (!this.context || this.disposed) return;
    const now = this.context.currentTime;
    for (const [param, value] of [[this.fmModulator.frequency, this.fm.rateHz], [this.fmDepth.gain, this.fm.depthHz]]) {
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, 0.08);
    }
  }

  async dispose() {
    this.stop();
    this.disposed = true;
    if (this.suspendTimer !== null) this.clearTimer(this.suspendTimer);
    this.suspendTimer = null;
    if (!this.context) return;
    for (const source of this.sources) source.stop();
    for (const node of this.nodes) node.disconnect();
    await this.context.close();
    this.context = null;
  }
}

function bindHypnoticAudio(document, music = new HypnoticAudio()) {
  const button = document.getElementById('music-toggle');
  const slider = document.getElementById('music-volume');
  const output = document.getElementById('music-volume-value');
  const status = document.getElementById('music-status');
  const synchronizeVolume = () => {
    music.setVolume(Number(slider.value) / 100);
    output.value = `${Math.round(music.volume * 100)} %`;
  };
  synchronizeVolume();
  slider.addEventListener('input', synchronizeVolume);
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      if (music.playing) music.stop();
      else await music.start();
      button.textContent = music.playing ? 'Couper la musique' : 'Activer la musique';
      button.setAttribute('aria-pressed', String(music.playing));
      status.textContent = music.playing ? 'Ambiance hypnotique active' : 'Musique coupée';
    } catch (error) {
      music.stop();
      button.textContent = 'Réessayer la musique';
      button.setAttribute('aria-pressed', 'false');
      status.textContent = 'Le son n’a pas démarré. Clique pour réessayer.';
    } finally {
      button.disabled = false;
    }
  });
  return music;
}
