const SeekScenarios = (() => {
  // Les deux variantes existantes restent accessibles dans le même menu.
  const definitions = {
    pursuit: { behavior: 'seek', arrival: 'vehicle', fleeing: false },
    endurance: { behavior: 'seek', arrival: 'vehicle', fleeing: true },
    targetRespawn: { behavior: 'seek', arrival: 'target', fleeing: false },
    flee: { behavior: 'flee', arrival: 'vehicle', fleeing: false },
    missile: { behavior: 'pursue', arrival: 'explosion', fleeing: false, missile: true },
  };
  function get(id) {
    if (!Object.hasOwn(definitions, id)) throw new RangeError('Scénario inconnu.');
    return definitions[id];
  }
  function createTarget(id, x, y, rng = Math.random) {
    const definition = get(id);
    if (definition.missile) throw new RangeError('Le scénario missile possède son propre contrôleur.');
    const target = definition.fleeing ? new TargetFuyante(x, y, rng) : new Target(x, y, rng);
    target.protected = false;
    return target;
  }
  return { get, createTarget };
})();
