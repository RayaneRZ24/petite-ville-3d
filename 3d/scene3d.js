// Three.js affiche les entités Yuka ; cette classe ne pilote pas leurs positions.
class Scene3D {
  constructor(container, world) {
    this.world = world;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(world.city ? '#bddbec' : '#df202b');
    this.scene.fog = new THREE.Fog(world.city?'#dceef8':'#df202b', 150, 400);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'Circuit 3D : glisser pour tourner, molette pour zoomer, T pour ajouter un bus');
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(48, 1, .1, 750);
    this.vehicleCamera = new VehicleCamera3D(this.camera);
    this.lastRenderTime = null;
    this.mirrorViews=new VehicleMirrors3D(this);
    this.orbit = { yaw: world.city ? .3 : .58, pitch: world.city ? .8 : .7, distance: world.city ? 145 : 74 };
    this.views = new Map();
    this.debugViews = new Map();
    this.avoidanceViews = new Map();
    this.droneMaterials = ['#54fff0', '#ffd65b', '#b3a0ff', '#90ff80'].map(color =>
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .7, roughness: .35 }));
    this.droneGeometry = new THREE.OctahedronGeometry(.3);
    this.droneArm = new THREE.BoxGeometry(.8, .04, .04);
    this.droneRotor = new THREE.TorusGeometry(.15, .025, 5, 12);
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
    const context = glowCanvas.getContext('2d');
    const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,.7)'); glow.addColorStop(.25, 'rgba(255,255,255,.25)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow; context.fillRect(0, 0, 64, 64);
    this.droneGlow = new THREE.CanvasTexture(glowCanvas);
    this.droneGlowMaterials = this.droneMaterials.map(material => new THREE.SpriteMaterial({
      map: this.droneGlow, color: material.color, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flockLinks = new THREE.LineSegments(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: '#70fff2', transparent: true, opacity: .35 }));
    this.flockLinks.visible = false;
    this.scene.add(this.flockLinks);
    this.white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .36 });
    this.black = new THREE.MeshStandardMaterial({ color: '#111111', roughness: .8 });
    this.grey = new THREE.MeshStandardMaterial({ color: '#bbbbbb', roughness: .45, metalness: .12 });
    this.ball = new THREE.SphereGeometry(1, 24, 16);
    this.scene.add(new THREE.HemisphereLight(0xffffff, world.city?0x617655:0x8c1723, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    if(world.city)sun.position.set(-65,85,-100);else sun.position.set(16,35,15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 240 });
    sun.shadow.normalBias = .03;
    this.scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ color: world.city ? '#64836b' : '#df202b', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.02;
    ground.receiveShadow = true;
    this.scene.add(ground);
    if(world.city){this.cityView=new CityView3D(this,world.city);this.cityLife=new CityLifeView3D(this,world.city);this.atmosphere=new CityAtmosphere3D(this.scene);this.cityActors=new CityActorsView3D(this);}
    else this.createTrack();
    this.bindCamera();
    this.resize();
    this.world.trafficDistancePixels = (a, b) => this.trafficDistancePixels(a, b);
  }

  createTrack() {
    this.createRoad(this.world.circuit);
  }
  focusIncident(){
    const shop=this.world.city?.shops[0];if(!shop)return;
    this.setCameraMode('free');this.orbit.target={x:shop.position.x,y:.5,z:shop.position.z+2};
    Object.assign(this.orbit,{yaw:.12,pitch:.95,distance:22});
  }

  createRoad(route, heightOffset=0) {
    const points = route.points;
    const edges = [[], []];
    for (let i = 0; i < points.length; i++) {
      const before = points[(i + points.length - 1) % points.length];
      const after = points[(i + 1) % points.length];
      const tangent = new THREE.Vector3(after.x - before.x, 0, after.z - before.z).normalize();
      const normal = new THREE.Vector3(tangent.z, 0, -tangent.x).multiplyScalar(route.radius);
      edges[0].push(new THREE.Vector2(points[i].x + normal.x, -points[i].z - normal.z));
      edges[1].push(new THREE.Vector2(points[i].x - normal.x, -points[i].z + normal.z));
    }
    const shape = new THREE.Shape(edges[0]);
    shape.holes.push(new THREE.Path(edges[1].reverse()));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false, steps: 1 });
    geometry.rotateX(-Math.PI / 2);
    const track = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#000000', roughness: .9 }));
    track.position.y=heightOffset;
    track.receiveShadow = true;
    this.scene.add(track);
  }

  addSnake(snake) {
    snake.anneaux.forEach((entity, index) => {
      const view = new THREE.Group();
      const radius = index === 0 ? .72 : .53 - index * .012;
      const sphere = new THREE.Mesh(this.ball, this.white);
      sphere.scale.setScalar(radius);
      if (index === 0) sphere.scale.z *= 1.15;
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      view.add(sphere);
      if (index === 0) {
        for (const side of [-1, 1]) {
          const eye = new THREE.Mesh(this.ball, this.black);
          eye.scale.setScalar(.12);
          eye.position.set(side * .26, .33, .59);
          view.add(eye);
        }
      }
      view.userData.height = radius + .18;
      this.scene.add(view);
      this.views.set(entity, view);
      this.createAvoidanceDebug(entity);
    });
    this.createDebug(snake);
  }

  addVehicle(entity) {
    const model=new VehicleModel3D(entity),view=model.root;
    this.scene.add(view);this.views.set(entity,view);this.createAvoidanceDebug(entity);
  }

  addBus(entity) {
    this.addVehicle(entity);this.createDebug(entity);
  }
  addDrone(entity) {
    const view = new THREE.Group(), colorIndex = entity.groupId % this.droneMaterials.length;
    const material = this.droneMaterials[colorIndex];
    const body = new THREE.Mesh(this.droneGeometry, material); body.scale.z = 1.5; body.castShadow = true;
    view.add(body);
    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      const arm = new THREE.Mesh(this.droneArm, this.black); arm.rotation.y = angle; view.add(arm);
    }
    for (const x of [-.28, .28]) for (const z of [-.28, .28]) {
      const rotor = new THREE.Mesh(this.droneRotor, material); rotor.rotation.x = Math.PI / 2; rotor.position.set(x, .02, z); view.add(rotor);
    }
    const glow = new THREE.Sprite(this.droneGlowMaterials[colorIndex]); glow.scale.set(1.6, 1.6, 1.6); view.add(glow);
    view.userData.height = 0;
    this.scene.add(view); this.views.set(entity, view);
  }

  clearDrones() {
    if(this.vehicleCamera.mode==='drone')this.setCameraMode('free');
    this.vehicleCamera.selectDrone(null);
    for (const [entity, view] of this.views) {
      if (entity instanceof FlockDrone3D) { this.scene.remove(view); this.views.delete(entity); }
    }
    this.flockLinks.geometry.dispose(); this.flockLinks.geometry = new THREE.BufferGeometry();
    this.flockLinks.visible = false;
    this.updateCameraStatus();
  }

  addObstacle(entity) {
    const status = document.getElementById('placement-status');
    if (!entity) {
      if (status) status.textContent = this.world.city && this.world.barriers.length >= 3
        ? 'Maximum atteint : les trois postes de contrôle sont déjà installés.'
        : 'Emplacement trop proche d’un véhicule : choisis un espace libre.';
      return;
    }
    if (status) status.textContent = '';
    const radius = entity.boundingRadius;
    const view = new THREE.Group();
    const width = radius * 1.8;
    const red = new THREE.MeshStandardMaterial({ color: '#f12f39', roughness: .7 });
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width / 8, .5, .22), i % 2 ? red : this.white);
      stripe.position.set(-width / 2 + (i + .5) * width / 8, .95, 0);
      stripe.castShadow = true;
      view.add(stripe);
    }
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.1, .14), this.black);
      post.position.set(side * width * .4, .55, 0);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .6), this.black);
      foot.position.set(side * width * .4, .06, 0);
      post.castShadow = true;
      view.add(post, foot);
    }
    view.userData.height = .18;
    this.views.set(entity, view);
    this.scene.add(view);
    this.addPolice(entity.officer);
  }

  addPolice(entity) {
    const view = new THREE.Group();
    const navy = new THREE.MeshStandardMaterial({ color: '#163c83', roughness: .7 });
    const skin = new THREE.MeshStandardMaterial({ color: '#edb995', roughness: .8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(.45, .48, .28), navy);
    torso.position.y = .85;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), skin);
    head.position.y = 1.24;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .12, 16), navy);
    cap.position.y = 1.38;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.28, .04, .18), this.black);
    visor.position.set(0, 1.33, .18);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(.07, .09, .025),
      new THREE.MeshStandardMaterial({ color: '#ffce30', metalness: .4 }));
    badge.position.set(-.1, .94, .155);
    view.add(torso, head, cap, visor, badge);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.15, .55, .2), navy);
      leg.position.set(side * .12, .3, 0);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(.17, .12, .3), this.black);
      boot.position.set(side * .12, .06, .035);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.12, .45, .15), navy);
      arm.position.set(side * .3, .8, 0);
      view.add(leg, boot, arm);
    }
    view.traverse(child => { if (child.isMesh) child.castShadow = true; });
    view.userData.height = .18;
    this.views.set(entity, view);
    this.scene.add(view);
  }

  trafficDistancePixels(a, b) {
    const first = new THREE.Vector3(a.position.x, .4, a.position.z).project(this.camera);
    const second = new THREE.Vector3(b.position.x, .4, b.position.z).project(this.camera);
    if (![first.x, first.y, second.x, second.y].every(Number.isFinite)) return Infinity;
    return Math.hypot((first.x - second.x) * window.innerWidth / 2,
      (first.y - second.y) * window.innerHeight / 2);
  }

  createAvoidanceDebug(entity) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: '#ffff00' }));
    line.visible = false;
    this.scene.add(line);
    this.avoidanceViews.set(entity, line);
  }

  createDebug(snake) {
    const head = snake.head || snake;
    const group = new THREE.Group();
    const circlePoints = [];
    for (let i = 0; i <= 64; i++) {
      const angle = i / 64 * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(Math.cos(angle) * head.wander.radius, .25, Math.sin(angle) * head.wander.radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePoints),
      new THREE.LineBasicMaterial({ color: '#00ffe0' })));
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#f8ff34' }));
    group.add(marker);
    const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: '#00ffe0' }));
    this.scene.add(ray, group);
    this.debugViews.set(snake, { group, marker, ray });
  }

  bindCamera() {
    const canvas = this.renderer.domElement;
    let pointer = null;
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      canvas.focus();
      pointer = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, id: event.pointerId, dragging: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointer) return;
      pointer.dragging ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 10;
      if (!pointer.dragging) return;
      if (this.vehicleCamera.mode === 'free') {
        this.orbit.yaw -= (event.clientX - pointer.x) * .006;
        this.orbit.pitch = Math.max(.08, Math.min(1.35, this.orbit.pitch + (event.clientY - pointer.y) * .005));
      }
      if(this.vehicleCamera.mode==='first'){
        this.vehicleCamera.lookYaw=Math.max(-Math.PI,Math.min(Math.PI,this.vehicleCamera.lookYaw-(event.clientX-pointer.x)*.004));
        this.vehicleCamera.lookPitch=Math.max(-.6,Math.min(.8,this.vehicleCamera.lookPitch+(event.clientY-pointer.y)*.004));
      }
      pointer.x = event.clientX; pointer.y = event.clientY;
    });
    canvas.addEventListener('pointerup', event => {
      if (!pointer) return;
      const click = !pointer.dragging && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) <= 10;
      pointer = null;
      if (!click) return;
      const rect = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);
      if (this.attractions?.pick(ray)) return;
      if (this.neuralLab?.pick(ray)) { this.neuralLab.open(); return; }
      if (!event.shiftKey) {
        const subject = this.pickSubject(ray);
        if (subject) {
          if (this.world.police.includes(subject)) this.vehicleCamera.selectPolice(subject);
          else if(this.world.boids.includes(subject))this.vehicleCamera.selectDrone(subject);
          else this.vehicleCamera.select(subject);
          this.updateCameraStatus(); return;
        }
        if (this.vehicleCamera.mode !== 'free') return;
      }
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      if (hit && Math.hypot(hit.x, hit.z) < 45) {
        const position = new YUKA.Vector3(hit.x, 0, hit.z);
        if (event.shiftKey) this.addObstacle(this.world.addObstacle(position));
        else {
          try{this.addVehicle(this.world.addVehicle(position));}catch(exception){
            if(!(exception instanceof RangeError))throw exception;
            const status=document.getElementById('placement-status');if(status)status.textContent=exception.message;
          }
        }
      }
    });
    canvas.addEventListener('pointercancel', () => { pointer = null; });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      if (this.vehicleCamera.mode !== 'free') return;
      this.orbit.distance = Math.max(this.orbit.target?8:35, Math.min(this.world.city?190:115, this.orbit.distance * Math.exp(event.deltaY * .001)));
    }, { passive: false });
  }

  pickTraffic(ray) {
    const roots = this.world.traffic.map(vehicle => this.views.get(vehicle)).filter(Boolean);
    const hits = ray.intersectObjects(roots, true);
    if (!hits.length) return null;
    let object = hits[0].object;
    while (object && !roots.includes(object)) object = object.parent;
    return this.world.traffic.find(vehicle => this.views.get(vehicle) === object) || null;
  }

  pickSubject(ray) {
    const entities = [...this.world.traffic, ...this.world.police, ...this.world.barriers,...(this.world.boids||[])];
    const owners = new Map(entities.map(entity => [this.views.get(entity), entity]).filter(([view]) => view));
    const hits = ray.intersectObjects([...owners.keys()], true);
    if (!hits.length) return null;
    let object = hits[0].object;
    while (object && !owners.has(object)) object = object.parent;
    const entity = owners.get(object);
    return entity?.officer || entity || null;
  }

  setPoliceCameraMode(mode) {
    if (!this.vehicleCamera.police) this.vehicleCamera.selectPolice(this.world.police[0] || null);
    const changed = this.vehicleCamera.setMode(mode);
    this.updateCameraStatus(changed ? '' : 'Ajoute un barrage pour observer depuis un policier.');
    this.renderer?.domElement.focus();
    return changed;
  }

  setDroneCamera(next=false) {
    const drones=this.world.boids;
    if(!drones.length){this.updateCameraStatus('Ajoute une nuée avec B pour utiliser la caméra drone.');return false;}
    const index=drones.indexOf(this.vehicleCamera.drone);
    const drone=drones[index<0?0:next?(index+1)%drones.length:index];
    this.vehicleCamera.selectDrone(drone);this.vehicleCamera.setMode('drone');this.updateCameraStatus();this.renderer?.domElement.focus();return true;
  }

  setCameraMode(mode) {
    const changed = this.vehicleCamera.setMode(mode);
    this.updateCameraStatus(changed ? '' : 'Sélectionne d’abord une voiture ou un bus au clic.');
    this.renderer?.domElement.focus();
    return changed;
  }

  updateCameraStatus(message = '') {
    const status = document.getElementById('camera-status');
    if (!status) return;
    const rig = this.vehicleCamera;
    const vehicle = rig.mode === 'free' ? rig.lastSelected : rig.subject;
    const police = this.world.police.includes(vehicle);
    const drone = this.world.boids?.includes(vehicle);
    const number = police ? this.world.police.indexOf(vehicle) + 1 : vehicle?.agentId;
    const label = vehicle ? `${drone ? 'Drone · nuée '+(vehicle.groupId+1)+' ·' : police ? 'Policier' : vehicle.isBus ? 'Bus' : 'Voiture'} ${number}` : 'Aucun véhicule sélectionné';
    const mode = { free: 'Vue 3D libre', first: 'Première personne', third: 'Troisième personne', 'police-first': 'Policier · première personne', 'police-third': 'Policier · troisième personne',drone:'Caméra drone' }[rig.mode];
    status.textContent = message || `${label} · ${mode} · V / N / 1 / 3 / P / O / 0`;
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  render(debug = false) {
    this.cityView?.render(this.world.mission);
    const now = performance.now(), dt = this.lastRenderTime === null ? 0 : (now - this.lastRenderTime) / 1000;
    this.lastRenderTime = now;
    this.cityActors?.sync(dt);
    this.atmosphere?.update(dt);this.cityLife?.update(dt);
    const { yaw, pitch, distance } = this.orbit;
    // Reculer en portrait conserve le circuit entier dans le champ de vision.
    const framedDistance = distance * Math.max(1, 1.2 / this.camera.aspect);
    if (!this.vehicleCamera.update(dt)) {
      const center=this.orbit.target||{x:0,y:0,z:0};
      this.camera.position.set(center.x+Math.sin(yaw) * Math.sin(pitch) * framedDistance,
        center.y+Math.cos(pitch) * framedDistance,center.z+Math.cos(yaw) * Math.sin(pitch) * framedDistance);
      this.camera.lookAt(center.x,center.y,center.z);
    }
    if(this.atmosphere)this.atmosphere.sky.position.copy(this.camera.position);
    for (const [entity, view] of this.views) {
      view.visible = !(this.vehicleCamera.firstPerson && this.vehicleCamera.mode!=='first' && this.vehicleCamera.subject === entity);
      view.position.set(entity.position.x, entity.position.y + view.userData.height, entity.position.z);
      view.quaternion.copy(entity.rotation);
      view.userData.model?.update(dt,this.world.mission?.bus===entity&&this.world.mission.state==='boarding');
      if (view.userData.body) view.userData.body.material.color.set(entity.overtake.leader ? '#ffc53a' : (view.userData.baseColor || '#bbbbbb'));
      if(view.userData.doors){
        const open=this.world.mission?.bus===entity&&this.world.mission.state==='boarding';
        view.userData.doorOpen=(view.userData.doorOpen||0)+((open?1:0)-(view.userData.doorOpen||0))*(1-Math.exp(-10*Math.min(.1,Math.max(0,dt))));
        view.userData.doors.forEach((door,i)=>{door.position.z=door.userData.closedZ+(i?1:-1)*.22*view.userData.doorOpen;});
      }
    }
    for (const [snake, view] of this.debugViews) {
      const head = snake.head || snake;
      view.group.visible = view.ray.visible = debug && snake.weights.wander > 0;
      if (!view.group.visible) continue;
      const center = new YUKA.Vector3(0, 0, head.wander.distance).applyMatrix4(head.worldMatrix);
      view.group.position.set(center.x, .3, center.z);
      const local = head.wander._targetLocal;
      const target = local.clone().add(new YUKA.Vector3(0, 0, head.wander.distance)).applyMatrix4(head.worldMatrix);
      view.marker.position.set(target.x - center.x, .25, target.z - center.z);
      view.ray.geometry.setFromPoints([new THREE.Vector3(head.position.x, .55, head.position.z), new THREE.Vector3(center.x, .55, center.z)]);
    }
    for (const [entity, line] of this.avoidanceViews) {
      line.visible = debug;
      if (!debug) continue;
      const behavior = entity.avoidance;
      line.material.color.set(behavior.detected ? '#ff3333' : '#ffff00');
      line.geometry.setFromPoints([entity.position, behavior.halfAhead, behavior.ahead].map(
        point => new THREE.Vector3(point.x, .65, point.z)));
    }
    this.flockLinks.visible = debug && this.world.boids.length > 0;
    if (this.flockLinks.visible) {
      const links = [];
      for (const drone of this.world.boids) for (const other of drone.flockNeighbors) {
        if (drone.agentId < other.agentId) {
          links.push(new THREE.Vector3(drone.position.x, drone.position.y, drone.position.z),
            new THREE.Vector3(other.position.x, other.position.y, other.position.z));
        }
      }
      this.flockLinks.geometry.dispose();
      this.flockLinks.geometry = new THREE.BufferGeometry().setFromPoints(links);
    }
    this.mirrorViews.update(dt);
    this.attractions?.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
