import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function fixture(){const document={createElement(){return {width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})};}};const c=vm.createContext({console,document});for(const file of ['libraries/3d/three.min.js','libraries/3d/yuka.js','3d/vehicleVisualState3d.js','3d/vehicleModel3d.js','3d/vehicleMirrors3d.js','3d/vehicleCamera3d.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);return vm.runInContext('({THREE,YUKA,VehicleVisualState3D,VehicleModel3D,VehicleMirrors3D,VehicleCamera3D})',c);}
test('habitacles : voitures et bus ont volant, compteur, levier, sièges, roues et trois miroirs',()=>{
 const {YUKA,VehicleModel3D}=fixture();for(const bus of [false,true]){const a=new YUKA.Vehicle();a.isBus=bus;const model=new VehicleModel3D(a);assert.equal(model.wheels.length,4);assert.equal(model.mirrors.length,3);assert.ok(model.steeringWheel&&model.needle&&model.gearLever);assert.equal(model.brakeLights.length,2);assert.ok(model.root.children.length>25);model.update(1/60,false);assert.ok(model.screenTexture);}
});

test('modèles : toutes les pièces restent dans le volume solide existant, roues braquées comprises',()=>{
 const {THREE,YUKA,VehicleModel3D}=fixture();for(const bus of [false,true]){const a=new YUKA.Vehicle();a.isBus=bus;const model=new VehicleModel3D(a);for(const w of model.wheels)if(w.front)w.pivot.rotation.y=.55;model.root.updateMatrixWorld(true);let radius=0;model.root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);radius=Math.max(radius,Math.hypot(v.x,v.z));}});assert.ok(radius<=(bus?1.16:.7),`rayon ${radius}`);}
});
test('animation : roues liées à distance réelle, volant dans les virages, freinage et pause',()=>{
 const {YUKA,VehicleVisualState3D}=fixture(),a=new YUKA.Vehicle(),s=new VehicleVisualState3D(a);a.velocity.set(0,0,4);a.position.z=.4;a.rotation.fromEuler(0,.2,0);const p=a.position.clone(),v=a.velocity.clone();s.update(a,.1);assert.ok(s.spin>0&&s.steer>0);assert.ok(Math.abs(s.steer)<=.55);assert.ok(a.position.equals(p)&&a.velocity.equals(v));const spin=s.spin;s.update(a,.1);assert.equal(s.spin,spin);a.velocity.set(0,0,0);s.update(a,.1);assert.equal(s.braking,true);assert.equal(s.gear,0);s.update(a,NaN);assert.equal(s.spin,spin);
});
test('animation : modèle suit le mouvement sans déplacer son entité',()=>{
 const {YUKA,VehicleModel3D}=fixture(),a=new YUKA.Vehicle(),m=new VehicleModel3D(a);a.position.set(.2,0,.4);a.rotation.fromEuler(0,.2,0);a.velocity.set(1,0,4);const before=a.position.clone();m.update(.1,false);assert.ok(m.wheels.filter(w=>w.front).every(w=>w.pivot.rotation.y>0));assert.ok(m.wheels.filter(w=>!w.front).every(w=>w.pivot.rotation.y===0));assert.ok(m.steeringWheel.rotation.z<0);assert.ok(a.position.equals(before));
});
test('miroirs : cadence limitée, vues arrière, restauration du renderer et libération au changement',()=>{
 const {THREE,YUKA,VehicleModel3D,VehicleMirrors3D}=fixture(),a=new YUKA.Vehicle(),b=new YUKA.Vehicle(),m=new VehicleModel3D(a),n=new VehicleModel3D(b);let renders=0,target=null;
 let viewport=new THREE.Vector4(0,0,1440,900),scissor=viewport.clone(),scissorTest=false;
 const renderer={shadowMap:{autoUpdate:true},getRenderTarget:()=>target,setRenderTarget(t){target=t;viewport=new THREE.Vector4(0,0,128,80);},getViewport(v){return v.copy(viewport);},setViewport(v){viewport.copy(v);},getScissor(v){return v.copy(scissor);},setScissor(v){scissor.copy(v);},getScissorTest:()=>scissorTest,setScissorTest(v){scissorTest=v;},render(){renders++;}};
 const view={views:new Map([[a,m.root],[b,n.root]]),vehicleCamera:{mode:'first',subject:a},renderer,scene:new THREE.Scene()};view.scene.add(m.root,n.root);const mirrors=new VehicleMirrors3D(view);
 for(let i=0;i<60;i++)mirrors.update(1/60);assert.ok(renders<=39);assert.ok(renders>=30);assert.equal(target,null);assert.equal(m.root.visible,true);assert.equal(renderer.shadowMap.autoUpdate,true);assert.ok(m.mirrors.every(r=>r.surface.material.map));assert.ok(mirrors.camera.getWorldDirection(new THREE.Vector3()).z<-.9);
 let disposed=0;for(const t of mirrors.targets)t.addEventListener('dispose',()=>disposed++);view.vehicleCamera.subject=b;mirrors.update(1/60);assert.equal(disposed,3);assert.ok(m.mirrors.every(r=>r.surface.material.map===null));
 const count=renders;view.vehicleCamera.mode='free';mirrors.update(1);assert.equal(renders,count);
 renderer.render=()=>{throw new Error('render test');};view.vehicleCamera.mode='first';assert.throws(()=>mirrors.update(1/60));assert.equal(n.root.visible,true);assert.equal(target,null);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(viewport.z,1440);assert.equal(viewport.w,900);assert.ok(n.mirrors.every(m=>m.surface.visible));
});
test('habitacle : regard orientable depuis siège conducteur, FOV et retour aux autres vues',()=>{
 const {THREE,YUKA,VehicleCamera3D}=fixture(),a=new YUKA.Vehicle(),camera=new THREE.PerspectiveCamera(),rig=new VehicleCamera3D(camera);rig.select(a);rig.setMode('first');rig.lookYaw=1;rig.lookPitch=.2;rig.update(0);assert.ok(camera.getWorldDirection(new THREE.Vector3()).x>.8);assert.equal(camera.fov,72);assert.equal(camera.near,.018);rig.setMode('third');assert.equal(camera.fov,48);assert.equal(rig.lookYaw,0);
});
