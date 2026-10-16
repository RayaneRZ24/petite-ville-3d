// Paramètres partagés par la synthèse FM et le mouvement du fond.
const FrequencyModulation = (() => {
  const MIN_RATE = 0.25;
  const MAX_RATE = 12;
  const MAX_DEPTH = 80;
  const VISUAL_RATE_DIVISOR = 8;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function parameters(rateHz, depthHz) {
    if (!Number.isFinite(rateHz) || !Number.isFinite(depthHz)) {
      throw new RangeError('Paramètres FM invalides.');
    }
    return { rateHz: clamp(rateHz, MIN_RATE, MAX_RATE), depthHz: clamp(depthHz, 0, MAX_DEPTH) };
  }

  function fromPointer(pointer, w, h) {
    if (w <= 0 || h <= 0 || ![pointer.x, pointer.y, w, h].every(Number.isFinite)) {
      throw new RangeError('Coordonnées FM invalides.');
    }
    const x = clamp(pointer.x / w, 0, 1);
    const y = clamp(pointer.y / h, 0, 1);
    return parameters(MIN_RATE + x * (MAX_RATE - MIN_RATE), (1 - y) * MAX_DEPTH);
  }

  function advancePhase(phase, elapsed, rateHz) {
    return (phase + Math.max(0, elapsed) * rateHz * TAU / VISUAL_RATE_DIVISOR) % TAU;
  }

  // Le centre est un p5.Vector distinct de la cible des véhicules.
  function animateCenter(center, pointer, w, h, phase, depthHz) {
    const amplitude = Math.min(w, h) * 0.18 * clamp(depthHz, 0, MAX_DEPTH) / MAX_DEPTH;
    center.set(
      clamp(pointer.x + Math.sin(phase) * amplitude, 0, w),
      clamp(pointer.y + Math.cos(phase) * amplitude * 0.65, 0, h));
    return center;
  }

  return { MIN_RATE, MAX_RATE, MAX_DEPTH, VISUAL_RATE_DIVISOR,
    parameters, fromPointer, advancePhase, animateCenter };
})();
