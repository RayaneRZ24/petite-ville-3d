// Caméra de rendu uniquement : ne modifie jamais l'état du véhicule Yuka.
class VehicleCamera3D {
  constructor(camera) {
    this.camera = camera;
    this.selected = null;
    this.police = null;
    this.drone = null;
    this.mode = 'free';
    this.snap = true;
    this.target = new THREE.Vector3();
    this.lookYaw=0;this.lookPitch=.12;
  }

  select(vehicle) { this.selected = this.lastSelected = vehicle; this.snap = true; }
  selectPolice(officer) { this.police = this.lastSelected = officer; this.snap = true; }
  selectDrone(drone) { this.drone = this.lastSelected = drone; this.snap = true; }
  get subject() { return this.mode === 'drone' ? this.drone : this.mode.startsWith('police-') ? this.police : this.selected; }
  get firstPerson() { return ['first','police-first','drone'].includes(this.mode); }

  setMode(mode) {
    if (!['free', 'first', 'third', 'police-first', 'police-third','drone'].includes(mode)) throw new RangeError('Vue inconnue.');
    if (mode === 'drone' ? !this.drone : mode.startsWith('police-') ? !this.police : mode !== 'free' && !this.selected) return false;
    this.mode = mode; this.snap = true;
    this.lookYaw=0;this.lookPitch=.12;
    this.camera.fov=mode==='first'?72:48;this.camera.near=mode==='first'?.018:.1;this.camera.updateProjectionMatrix();
    return true;
  }

  update(dt) {
    if (this.mode === 'free' || !this.subject) return false;
    const vehicle = this.subject;
    const rotation = new THREE.Quaternion(vehicle.rotation.x, vehicle.rotation.y, vehicle.rotation.z, vehicle.rotation.w);
    const origin = new THREE.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    const first = this.firstPerson, bus = vehicle.isBus, police = this.mode.startsWith('police-');
    if(this.mode==='drone') {
      return this.updateDrone(vehicle,origin,rotation,dt);
    }
    if(this.mode==='first'){
      const eye=new THREE.Vector3(bus ? .28 : .17,bus ? 1.13 : .82,bus ? .40 : -.20).applyQuaternion(rotation).add(origin);
      if(bus){const lean=Math.max(0,(Math.abs(this.lookYaw)-Math.PI/2)/(Math.PI/2))*.24;eye.add(new THREE.Vector3(-lean,0,0).applyQuaternion(rotation));}
      const direction=new THREE.Vector3(Math.sin(this.lookYaw)*Math.cos(this.lookPitch),-Math.sin(this.lookPitch),Math.cos(this.lookYaw)*Math.cos(this.lookPitch)).applyQuaternion(rotation);
      this.camera.position.copy(eye);this.target.copy(eye).add(direction);this.camera.lookAt(this.target);this.snap=false;return true;
    }
    const eyeHeight = police ? 1.42 : bus ? 1.1 : .8;
    const offset = new THREE.Vector3(0, first ? eyeHeight : police ? 2.8 : 3.2, first ? (police ? .15 : bus ? .7 : .3) : police ? -4.5 : -6);
    const position = offset.applyQuaternion(rotation).add(origin);
    const aim = new THREE.Vector3(0, first ? eyeHeight - .05 : police ? 1 : .75, first ? 12 : 3).applyQuaternion(rotation).add(origin);
    const alpha = this.snap || first ? 1 : 1 - Math.exp(-8 * Math.max(0, Math.min(.1, Number.isFinite(dt) ? dt : 0)));
    this.camera.position.lerp(position, alpha);
    this.target.lerp(aim, alpha);
    this.camera.lookAt(this.target);
    this.snap = false;
    return true;
  }

  updateDrone(vehicle,origin,rotation,dt) {
    const delta=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
    // Le flocking reste réactif ; la caméra conserve un horizon horizontal.
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(rotation);
    const speed=Math.hypot(vehicle.velocity.x,vehicle.velocity.z);
    const desiredYaw=speed>.25?Math.atan2(vehicle.velocity.x,vehicle.velocity.z):this.snap?Math.atan2(forward.x,forward.z):this.droneYaw;
    if(this.snap)this.droneYaw=desiredYaw;
    else {
      const difference=Math.atan2(Math.sin(desiredYaw-this.droneYaw),Math.cos(desiredYaw-this.droneYaw));
      const turn=difference*(1-Math.exp(-2.5*delta));
      this.droneYaw+=Math.max(-.8*delta,Math.min(.8*delta,turn));
    }
    const direction=new THREE.Vector3(Math.sin(this.droneYaw),0,Math.cos(this.droneYaw));
    const position=origin.clone().add(direction.clone().multiplyScalar(.4));position.y+=.12;
    this.camera.position.lerp(position,this.snap?1:1-Math.exp(-5*delta));
    this.target.copy(this.camera.position).add(direction.multiplyScalar(12));this.target.y-=1.62;
    this.camera.up.set(0,1,0);this.camera.lookAt(this.target);this.snap=false;return true;
  }
}
