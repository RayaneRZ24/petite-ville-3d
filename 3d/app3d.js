(() => {
  const error = document.getElementById('scene-error');
  try {
    const city = new CityMap3D();
    const world = new World3D(Math.random,city.route);
    const view = new Scene3D(document.getElementById('scene'), world);
    const vehicleSelect = document.getElementById('vehicle-select');
    let listedVehicles = -1;
    function refreshVehicleList() {
      if (listedVehicles !== world.traffic.length) {
        vehicleSelect.innerHTML = '<option value="">Choisir un véhicule…</option>' + world.traffic.map(vehicle =>
          `<option value="${vehicle.agentId}">${vehicle.incidentRole==='police'?'Police':vehicle.incidentRole==='getaway'?'Voiture de fuite':vehicle.isBus ? 'Bus' : 'Voiture'} ${vehicle.agentId}</option>`).join('');
        listedVehicles = world.traffic.length;
      }
      vehicleSelect.value = String(view.vehicleCamera?.selected?.agentId ?? '');
    }
    vehicleSelect.addEventListener('change', () => {
      const vehicle = world.traffic.find(vehicle => String(vehicle.agentId) === vehicleSelect.value);
      if (!vehicle) return;
      view.vehicleCamera.select(vehicle);
      view.setCameraMode('third');
    });
    const sliders = ['bus-follow', 'bus-separation', 'bus-wander'].map(id => document.getElementById(id));
    const outputs = ['follow-value', 'separation-value', 'wander-value'].map(id => document.getElementById(id));
    const flockSliders = ['flock-align', 'flock-cohesion', 'flock-separation'].map(id => document.getElementById(id));
    const flockOutputs = ['flock-align-value', 'flock-cohesion-value', 'flock-separation-value'].map(id => document.getElementById(id));
    let debug = false;
    let paused = false;
    const counter = document.getElementById('bus-count');
    const panel = document.getElementById('controls');
    const panelToggle = document.getElementById('settings3d-toggle');
    panel.hidden = window.innerWidth < 600;
    panelToggle.setAttribute('aria-expanded', String(!panel.hidden));
    panelToggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      panelToggle.setAttribute('aria-expanded', String(!panel.hidden));
    });
    function addBus() {
      try{view.addBus(world.addBus());}catch(exception){if(!(exception instanceof RangeError))throw exception;document.getElementById('placement-status').textContent=exception.message;return;}
      counter.textContent = `${world.buses.length} bus`;
    }
    function weightsChanged() {
      const values = sliders.map(input => Number(input.value));
      world.setWeights(...values);
      values.forEach((value, i) => { outputs[i].value = value.toFixed(1); });
    }
    for (const input of sliders) input.addEventListener('input', weightsChanged);
    function flockWeightsChanged() {
      const values = flockSliders.map(input => Number(input.value));
      world.setFlockWeights(...values);
      values.forEach((value, i) => { flockOutputs[i].value = value.toFixed(1); });
    }
    function flockCountChanged() {
      const groups = new Set(world.boids.map(drone => drone.groupId)).size;
      document.getElementById('flock-count').textContent = `${world.boids.length}/72 drones · ${groups} nuée${groups === 1 ? '' : 's'}`;
    }
    function addFlock() {
      for (const drone of world.addFlock()) view.addDrone(drone);
      flockCountChanged();
    }
    for (const input of flockSliders) input.addEventListener('input', flockWeightsChanged);
    document.getElementById('add-flock').addEventListener('click', addFlock);
    document.getElementById('clear-flocks').addEventListener('click', () => {
      world.clearFlocks(); view.clearDrones(); flockCountChanged();
    });
    document.getElementById('add-bus').addEventListener('click', addBus);
    document.getElementById('pause').addEventListener('click', event => {
      paused = !paused;
      event.currentTarget.textContent = paused ? 'Reprendre' : 'Pause';
      event.currentTarget.setAttribute('aria-pressed', String(paused));
    });
    document.getElementById('camera-reset').addEventListener('click', () => {
      view.setCameraMode('free');
      view.orbit.target=null;
      Object.assign(view.orbit, { yaw: .3, pitch: .8, distance: 145 });
    });
    document.getElementById('camera-top').addEventListener('click', () => {
      view.setCameraMode('free');
      view.orbit.target=null;
      Object.assign(view.orbit, { yaw: 0, pitch: .08, distance: 145 });
    });
    document.getElementById('camera-first').addEventListener('click', () => view.setCameraMode('first'));
    function startIncident(){world.incident?.start();view.renderer?.domElement.focus();}
    document.getElementById('start-incident').addEventListener('click',startIncident);
    document.getElementById('incident-camera').addEventListener('click',()=>view.focusIncident());
    document.getElementById('chase-camera').addEventListener('click',()=>{const car=world.incident?.getaway;if(car&&world.traffic.includes(car)){view.vehicleCamera.select(car);view.setCameraMode('third');}});
    document.getElementById('camera-third').addEventListener('click', () => view.setCameraMode('third'));
    document.getElementById('camera-police-first').addEventListener('click', () => view.setPoliceCameraMode('police-first'));
    document.getElementById('camera-police-third').addEventListener('click', () => view.setPoliceCameraMode('police-third'));
    document.getElementById('camera-drone').addEventListener('click',()=>view.setDroneCamera());
    document.getElementById('next-drone').addEventListener('click',()=>view.setDroneCamera(true));
    function startMission(){const bus=view.vehicleCamera?.selected?.isBus?view.vehicleCamera.selected:world.buses[0];if(world.mission.start(bus)){view.vehicleCamera.select(bus);view.setCameraMode('third');view.renderer?.domElement.focus();}}
    document.getElementById('start-mission').addEventListener('click',startMission);
    document.getElementById('bus-doors').addEventListener('click',()=>{world.mission.openDoors();view.renderer?.domElement.focus();});
    window.addEventListener('keydown', event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = document.activeElement;
      if (target?.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target?.tagName)) return;
      if (event.key.toLowerCase() === 't') addBus();
      if (event.key.toLowerCase() === 'h') startIncident();
      if (event.key === '1') view.setCameraMode('first');
      if (event.key === '3') view.setCameraMode('third');
      if (event.key.toLowerCase() === 'p') view.setPoliceCameraMode('police-first');
      if (event.key.toLowerCase() === 'o') view.setPoliceCameraMode('police-third');
      if (event.key.toLowerCase() === 'v') view.setDroneCamera();
      if (event.key.toLowerCase() === 'n') view.setDroneCamera(true);
      if (event.key.toLowerCase() === 'm') startMission();
      if (event.key === ' ') {event.preventDefault?.();world.mission.openDoors();}
      if (event.key === '0' || event.key === 'Escape') view.setCameraMode('free');
      if (event.key.toLowerCase() === 'b') addFlock();
      if (event.key.toLowerCase() === 'd') {
        debug = !debug;
        document.getElementById('debug-state').textContent = debug ? 'activé' : 'désactivé';
      }
    });
    window.addEventListener('resize', () => view.resize());
    // Barrages latéraux : conserver un passage libre sur la chaussée élargie.
    for (const index of [4, 15, 26, 37, 48, 59]) {
      const spawn = world.circuit.spawn(index);
      const offset = 1.6;
      spawn.point.add(new YUKA.Vector3(spawn.direction.z * offset, 0, -spawn.direction.x * offset));
      view.addObstacle(world.addObstacle(spawn.point));
    }
    for (let i = 0; i < 15; i++) view.addVehicle(world.addVehicle());
    addBus();
    weightsChanged();
    flockWeightsChanged();
    addFlock();
    world.incident?.populate();
    refreshVehicleList();
    let previous = performance.now();
    document.addEventListener('visibilitychange', () => { previous = performance.now(); });
    function animate(now) {
      if (!paused && !document.hidden) world.update((now - previous) / 1000);
      previous = now;
      refreshVehicleList();
      view.render(debug);
      requestAnimationFrame(animate);
    }
    // Permet aux tests de vérifier le vrai moteur et le vrai rendu, sans API réseau.
    window.pathFollowing3D = { world, view, get debug() { return debug; }, get paused() { return paused; } };
    requestAnimationFrame(animate);
  } catch (exception) {
    error.hidden = false;
    error.textContent = `La scène 3D n'a pas pu démarrer : ${exception.message}. Vérifie que WebGL est activé dans ton navigateur.`;
    console.error(exception);
  }
})();
