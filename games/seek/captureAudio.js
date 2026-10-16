// Échantillon local exact du lien fourni. Indépendant de la musique Web Audio.
class CaptureAudio {
  constructor(audio = new Audio('assets/monster-kill.m4a')) {
    this.audio = audio;
    this.audio.preload = 'auto';
    this.audio.volume = 0.55;
    this.enabled = false;
    this.ready = false;
    this.onStatus = () => {};
  }

  async enable() {
    this.enabled = true;
    try {
      // Cet appel reste dans le geste utilisateur pour autoriser le son.
      await this.audio.play();
      if (!this.enabled) return false;
      this.ready = true;
      this.onStatus('Monster Kill activé pour les captures.');
      return true;
    } catch {
      this.enabled = false;
      this.ready = false;
      this.onStatus('Son indisponible. Clique sur « Activer Monster Kill » pour réessayer.');
      return false;
    }
  }

  disable() {
    this.enabled = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.onStatus('Effet de capture désactivé.');
  }

  capture() {
    if (!this.enabled || !this.ready) return false;
    // Les captures rapprochées partagent le son en cours pour garder la phrase audible.
    if (!this.audio.paused && !this.audio.ended) return false;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      this.ready = false;
      this.onStatus('Clique sur « Activer Monster Kill » pour réactiver le son.');
    });
    return true;
  }

  setVolume(percent) { this.audio.volume = Math.max(0, Math.min(1, percent / 100)); }
}

function bindCaptureAudio(document) {
  const sound = new CaptureAudio();
  const button = document.getElementById('capture-sound-toggle');
  const status = document.getElementById('capture-sound-status');
  const volume = document.getElementById('capture-volume');
  sound.onStatus = message => {
    status.textContent = message;
    button.textContent = sound.enabled && sound.ready ? 'Couper Monster Kill' : 'Activer Monster Kill';
    button.setAttribute('aria-pressed', String(sound.enabled && sound.ready));
  };
  button.addEventListener('click', async () => {
    if (sound.enabled && sound.ready) sound.disable();
    else await sound.enable();
  });
  volume.addEventListener('input', () => {
    sound.setVolume(Number(volume.value));
    document.getElementById('capture-volume-value').value = `${volume.value} %`;
  });
  return sound;
}
