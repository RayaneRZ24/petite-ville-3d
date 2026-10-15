import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fixture() {
  const context = vm.createContext({ console });
  for (const file of ['libraries/3d/three.min.js', 'libraries/3d/yuka.js', '3d/vehicleCamera3d.js', '3d/scene3d.js'])
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
  return vm.runInContext('({THREE,YUKA,VehicleCamera3D,Scene3D})', context);
}

test('caméra : sélection obligatoire, modes et retour libre sans modifier le véhicule', () => {
  const {THREE,YUKA,VehicleCamera3D}=fixture(), camera=new THREE.PerspectiveCamera(), rig=new VehicleCamera3D(camera);
  assert.equal(rig.setMode('first'),false); assert.equal(rig.mode,'free'); assert.equal(rig.update(.016),false);
  assert.throws(()=>rig.setMode('invalid'),{name:'RangeError'});
  const car=new YUKA.Vehicle();car.position.set(10,0,20);const pos=car.position.clone(),vel=car.velocity.clone();
  rig.select(car); assert.equal(rig.setMode('first'),true);rig.update(.016);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(10.17,.82,19.80))<1e-8);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).z>.99);
  assert.ok(car.position.equals(pos)&&car.velocity.equals(vel));
  rig.setMode('free'); const before=camera.position.clone();assert.equal(rig.update(1),false);assert.ok(camera.position.equals(before));
});

test('caméra : orientation du véhicule, première personne bus et poursuite derrière', () => {
  const {THREE,YUKA,VehicleCamera3D}=fixture(), camera=new THREE.PerspectiveCamera(), rig=new VehicleCamera3D(camera);
  const bus=new YUKA.Vehicle();bus.isBus=true;bus.position.set(2,0,3);bus.rotation.fromEuler(0,Math.PI/2,0);
  rig.select(bus);rig.setMode('first');rig.update(0);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(2.40,1.13,2.72))<1e-8);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).x>.99);
  rig.setMode('third');rig.update(0);assert.ok(camera.position.distanceTo(new THREE.Vector3(-4,3.2,3))<1e-8);
});

test('caméra : lissage indépendant de la cadence, temps invalide et véhicule immobile', () => {
  const {THREE,YUKA,VehicleCamera3D}=fixture();
  function make(){const camera=new THREE.PerspectiveCamera(),rig=new VehicleCamera3D(camera),car=new YUKA.Vehicle();rig.select(car);rig.setMode('third');rig.update(0);car.position.x=10;return {camera,rig,car};}
  const a=make(),b=make();for(let i=0;i<60;i++)a.rig.update(1/60);for(let i=0;i<30;i++)b.rig.update(1/30);
  assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-8);assert.ok(a.camera.position.x>9.9);
  const before=a.camera.position.clone();a.rig.update(NaN);a.rig.update(-1);assert.ok(a.camera.position.equals(before));
  for(let i=0;i<100;i++)a.rig.update(.016);assert.ok(Number.isFinite(a.camera.position.x));
});

test('caméra : raycasting des carrosseries sélectionne le véhicule le plus proche, pas le décor', () => {
  const {THREE,Scene3D}=fixture(), near={},far={},a=new THREE.Group(),b=new THREE.Group();
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());a.add(mesh);
  const view={world:{traffic:[far,near]},views:new Map([[near,a],[far,b]])};
  const ray={intersectObjects(roots,recursive){assert.equal(roots.length,2);assert.equal(recursive,true);return [{object:mesh},{object:b}];}};
  assert.equal(Scene3D.prototype.pickTraffic.call(view,ray),near);
  assert.equal(Scene3D.prototype.pickTraffic.call(view,{intersectObjects:()=>[]}),null);
});

test('caméra : clic sélectionne sans créer, drag et zoom réservés à la vue libre', () => {
  const {THREE,Scene3D,VehicleCamera3D}=fixture(), events={},car={},camera=new THREE.PerspectiveCamera();
  const canvas={addEventListener(n,fn){events[n]=fn;},focus(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}};
  const view={renderer:{domElement:canvas},world:{police:[],boids:[]},camera,vehicleCamera:new VehicleCamera3D(camera),orbit:{yaw:0,pitch:.7,distance:74},pickSubject:()=>car,updateCameraStatus(){},addVehicle(){assert.fail('Sélection ne doit pas créer');}};
  Scene3D.prototype.bindCamera.call(view);
  const e={button:0,clientX:50,clientY:50,pointerId:1};events.pointerdown(e);events.pointerup(e);
  assert.equal(view.vehicleCamera.selected,car);
  let picks=0;view.pickSubject=()=>{picks++;return car;};
  events.pointerdown(e);events.pointermove({...e,clientX:58});events.pointerup({...e,clientX:58});
  assert.equal(picks,1);assert.equal(view.orbit.yaw,0,'petit tremblement sans rotation');
  events.pointerdown(e);events.pointermove({...e,clientX:70});events.pointermove(e);events.pointerup(e);
  assert.equal(picks,1,'un glissement revenu au départ reste un glissement');
  view.orbit.yaw=0;
  view.vehicleCamera.setMode('third');events.pointerdown(e);events.pointermove({...e,clientX:70});events.pointerup({...e,clientX:70});
  assert.equal(view.orbit.yaw,0);events.wheel({preventDefault(){},deltaY:100});assert.equal(view.orbit.distance,74);
  view.vehicleCamera.setMode('free');events.pointerdown(e);events.pointermove({...e,clientX:70});events.pointercancel();assert.notEqual(view.orbit.yaw,0);
});

test('caméra : vue rapprochée du commerce sans modifier les entités',()=>{
 const {Scene3D}=fixture(),shop={position:{x:18,z:-9}},view={world:{city:{shops:[shop]}},orbit:{},setCameraMode(mode){this.mode=mode;}};
 Scene3D.prototype.focusIncident.call(view);assert.equal(view.mode,'free');assert.equal(view.orbit.distance,22);assert.deepEqual({...view.orbit.target},{x:18,y:.5,z:-7});assert.deepEqual(shop.position,{x:18,z:-9});
});

test('drone : caméra embarquée réelle, changement de membre et nuée absente',()=>{
  const {THREE,YUKA,Scene3D,VehicleCamera3D}=fixture(),a=new YUKA.Vehicle(),b=new YUKA.Vehicle();a.position.set(2,5.5,3);
  const view={world:{boids:[a,b]},vehicleCamera:new VehicleCamera3D(new THREE.PerspectiveCamera()),updateCameraStatus(){}};
  assert.equal(Scene3D.prototype.setDroneCamera.call(view),true);view.vehicleCamera.update(0);
  assert.equal(view.vehicleCamera.subject,a);assert.ok(view.vehicleCamera.camera.position.distanceTo(new THREE.Vector3(2,5.62,3.4))<1e-8);
  Scene3D.prototype.setDroneCamera.call(view,true);assert.equal(view.vehicleCamera.subject,b);
  Scene3D.prototype.setDroneCamera.call(view,true);assert.equal(view.vehicleCamera.subject,a);
  view.world.boids=[];assert.equal(Scene3D.prototype.setDroneCamera.call(view),false);
});

test('drone : les zigzags et roulis ne renversent pas l’horizon, rotation plafonnée et position lissée',()=>{
 const {THREE,YUKA,VehicleCamera3D}=fixture(),drone=new YUKA.Vehicle(),camera=new THREE.PerspectiveCamera(),rig=new VehicleCamera3D(camera);
 drone.position.y=5.5;drone.velocity.set(0,0,4);rig.selectDrone(drone);rig.setMode('drone');rig.update(0);
 const pos=drone.position.clone(),velocity=drone.velocity.clone();let previous=rig.droneYaw;
 for(let i=0;i<120;i++){drone.rotation.fromEuler(i%2?1:-1,0,i%2?1:-1);drone.velocity.set(i%2?4:-4,0,0);rig.update(1/60);assert.ok(Math.abs(rig.droneYaw-previous)<=.8/60+1e-8);previous=rig.droneYaw;const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);assert.ok(Math.abs(right.y)<1e-8);}
 drone.position.x=20;const before=camera.position.clone();rig.update(1/60);assert.ok(camera.position.x-before.x<2);
 assert.equal(drone.position.y,pos.y);assert.equal(drone.velocity.length(),velocity.length());
 const stable=camera.position.clone(),yaw=rig.droneYaw;rig.update(NaN);rig.update(-1);assert.ok(camera.position.equals(stable));assert.equal(rig.droneYaw,yaw);
});

test('drone : lissage indépendant de la cadence, direction conservée à l’arrêt',()=>{
 const {THREE,YUKA,VehicleCamera3D}=fixture();
 function make(){const d=new YUKA.Vehicle(),r=new VehicleCamera3D(new THREE.PerspectiveCamera());d.velocity.set(0,0,4);r.selectDrone(d);r.setMode('drone');r.update(0);d.velocity.set(4,0,0);d.position.set(10,5.5,0);return {d,r};}
 const a=make(),b=make();for(let i=0;i<60;i++)a.r.update(1/60);for(let i=0;i<30;i++)b.r.update(1/30);
 assert.ok(Math.abs(a.r.droneYaw-b.r.droneYaw)<.03);assert.ok(a.r.camera.position.distanceTo(b.r.camera.position)<.04);
 a.d.velocity.set(0,0,0);const yaw=a.r.droneYaw;a.d.rotation.fromEuler(0,Math.PI,0);for(let i=0;i<60;i++)a.r.update(1/60);assert.equal(a.r.droneYaw,yaw);
});

test('policier : hauteur des yeux, orientation et troisième personne sans changer position ou vitesse', () => {
  const {THREE,YUKA,VehicleCamera3D}=fixture(),camera=new THREE.PerspectiveCamera(),rig=new VehicleCamera3D(camera);
  assert.equal(rig.setMode('police-first'),false);
  const officer=new YUKA.Vehicle();officer.position.set(2,0,3);officer.rotation.fromEuler(0,Math.PI/2,0);
  const pos=officer.position.clone(),vel=officer.velocity.clone();
  rig.selectPolice(officer);rig.setMode('police-first');rig.update(0);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(2.15,1.42,3))<1e-8);
  assert.equal(rig.firstPerson,true);assert.equal(rig.subject,officer);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).x>.99);
  rig.setMode('police-third');rig.update(0);
  assert.ok(camera.position.distanceTo(new THREE.Vector3(-2.5,2.8,3))<1e-8);
  assert.equal(rig.firstPerson,false);assert.ok(officer.position.equals(pos)&&officer.velocity.equals(vel));
});

test('policier : sélection par barrière, indépendance voiture/policier et repli sans barrage', () => {
  const {THREE,YUKA,Scene3D,VehicleCamera3D}=fixture(),officer=new YUKA.Vehicle(),car=new YUKA.Vehicle(),barrier={officer};
  const a=new THREE.Group(),b=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());b.add(mesh);
  const view={world:{traffic:[car],police:[officer],barriers:[barrier]},views:new Map([[car,a],[barrier,b]]),vehicleCamera:new VehicleCamera3D(new THREE.PerspectiveCamera()),updateCameraStatus(){}};
  assert.equal(Scene3D.prototype.pickSubject.call(view,{intersectObjects:()=>[{object:mesh}]}),officer);
  view.vehicleCamera.select(car);assert.equal(Scene3D.prototype.setPoliceCameraMode.call(view,'police-first'),true);
  assert.equal(view.vehicleCamera.subject,officer);view.vehicleCamera.setMode('first');assert.equal(view.vehicleCamera.subject,car);
  view.vehicleCamera.selectPolice(null);view.world.police=[];assert.equal(Scene3D.prototype.setPoliceCameraMode.call(view,'police-third'),false);
  assert.equal(view.vehicleCamera.mode,'first');
});
