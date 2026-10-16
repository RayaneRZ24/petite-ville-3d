// Décor uniquement : aucune force ni position de véhicule n'est modifiée.
const HypnoticBackground = (() => {
  function draw(context, w, h, animationTime, options = {}) {
    if (w <= 0 || h <= 0) return;
    const centerX = Math.max(0, Math.min(w, options.center?.x ?? w / 2));
    const centerY = Math.max(0, Math.min(h, options.center?.y ?? h / 2));
    const intensity = Math.max(0, Math.min(1, options.intensity ?? 0.75));
    // Deux cycles de couleurs donnent des anneaux larges, fondus entre eux.
    const radius = Math.max(w, h) * 0.85;
    const saturation = 65 + intensity * 35;
    const lightness = 24 + intensity * 26;

    context.save();
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    for (let index = 0; index <= 24; index++) {
      const hue = ((60 + index * 30 + animationTime * 30) % 360 + 360) % 360;
      gradient.addColorStop(index / 24, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    context.restore();
  }

  return { draw };
})();
