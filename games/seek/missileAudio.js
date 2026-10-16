// Sons procéduraux du scénario missile, générés par WebAudiox + jsfx.
class MissileAudio {
  constructor(options = {}) {
    this.createContext = options.createContext ?? (() => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Audio non pris en charge.');
      return new AudioContext();
    });
    this.context = null;
    this.master = null;
    this.enabled = false;
    this.volume = 0.32;
    this.buffers = {};
    this.escapeSources = new Map();
    this.oneShots = new Set();
    this.onStatus = () => {};
  }

  createGraph() {
    const context = this.createContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.volume;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 7;
    this.master.connect(compressor);
    compressor.connect(context.destination);
    // Ordre des paramètres : format officiel jsfx utilisé par WebAudiox.getBufferFromJsfx().
    const presets = {
      alarm: ['square', 0, .24, .01, .18, .45, .20, 620, 940, 1200, .08, 0, .22, 12, 0, 0, .22, .08, .48, -.08, 0, 0, 0, 1, 0, 0, .08, 0],
      escape: ['saw', 0, .12, .02, .34, 0, .14, 90, 210, 420, .10, 0, .08, 5, 0, 0, 0, 0, 0, 0, .12, 0, 0, .42, .04, .08, .20, 0],
      decoys: ['sine', 0, .28, .005, .17, .8, .16, 360, 1120, 1800, .35, 0, .18, 18, 0, .45, .32, 0, .45, -.35, 0, 0, 0, 1, 0, 0, .12, 0],
      explosion: ['noise', 0, .36, .005, .24, .9, .445, 20, 440, 1200, -.42, -.08, 0, .01, 0, 0, .15, .2, 0, 0, .62, -.18, .34, .72, -.16, .08, .08, .18],
    };
    for (const [name, preset] of Object.entries(presets)) {
      this.buffers[name] = WebAudiox.getBufferFromJsfx(context, preset);
    }
  }

  async enable() {
    if (!this.context) this.createGraph();
    await this.context.resume();
    this.enabled = true;
    this.onStatus('Effets missile actifs.');
    this.playOneShot('alarm', 0.4, 0.45);
    return true;
  }

  disable() {
    this.enabled = false;
    for (const target of [...this.escapeSources.keys()]) this.stopEscape(target);
    for (const source of [...this.oneShots]) {
      try { source.stop(); } catch {}
    }
    this.oneShots.clear();
    this.onStatus('Effets missile coupés.');
  }

  setVolume(percent) {
    this.volume = Math.max(0, Math.min(1, percent / 100));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.025);
  }

  playOneShot(name, duration, level = 1) {
    if (!this.enabled || !this.context) return null;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers[name];
    gain.gain.value = level;
    source.connect(gain);
    gain.connect(this.master);
    this.oneShots.add(source);
    source.onended = () => this.oneShots.delete(source);
    const now = this.context.currentTime;
    source.start(now);
    source.stop(now + duration);
    return source;
  }

  alarm() { return this.playOneShot('alarm', 0.4, 0.42); }
  decoys() { return this.playOneShot('decoys', 0.46, 0.58); }
  explosion() { return this.playOneShot('explosion', 0.7, 0.9); }

  startEscape(target) {
    if (!this.enabled || !this.context || this.escapeSources.has(target)) return null;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffers.escape;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.master);
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
    source.start(now);
    this.escapeSources.set(target, { source, gain });
    source.onended = () => this.escapeSources.delete(target);
    return source;
  }

  stopEscape(target) {
    const playing = this.escapeSources.get(target);
    if (!playing || !this.context) return false;
    const now = this.context.currentTime;
    playing.gain.gain.cancelScheduledValues(now);
    playing.gain.gain.setValueAtTime(playing.gain.gain.value, now);
    playing.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    try { playing.source.stop(now + 0.085); } catch {}
    this.escapeSources.delete(target);
    return true;
  }
}

function bindMissileAudio(document) {
  const audio = new MissileAudio();
  const button = document.getElementById('missile-audio-toggle');
  const volume = document.getElementById('missile-audio-volume');
  const status = document.getElementById('missile-audio-status');
  audio.onStatus = message => {
    status.textContent = message;
    button.textContent = audio.enabled ? 'Couper les effets missile' : 'Activer les effets missile';
    button.setAttribute('aria-pressed', String(audio.enabled));
  };
  button.addEventListener('click', async () => {
    if (audio.enabled) audio.disable();
    else {
      try { await audio.enable(); }
      catch { audio.onStatus('Impossible de démarrer Web Audio dans ce navigateur.'); }
    }
  });
  volume.addEventListener('input', () => {
    audio.setVolume(Number(volume.value));
    document.getElementById('missile-audio-volume-value').value = `${volume.value} %`;
  });
  return audio;
}
