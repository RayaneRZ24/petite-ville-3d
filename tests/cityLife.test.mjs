import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function fixture(){const c=vm.createContext({console});for(const f of ['libraries/3d/three.min.js','libraries/3d/yuka.js','3d/circuit3d.js','3d/cityRoute3d.js','3d/building3d.js','3d/busStop3d.js','3d/passenger3d.js','3d/tree3d.js','3d/streetLamp3d.js','3d/fairground3d.js','3d/shop3d.js','3d/citySolids3d.js','3d/streetNetwork3d.js','3d/cityMap3d.js','3d/cityAtmosphere3d.js','3d/cityLifeView3d.js'])vm.runInContext(readFileSync(new URL('../'+f,import.meta.url),'utf8'),c);return vm.runInContext('({THREE,YUKA,CityMap3D,CityAtmosphere3D,CityLifeView3D})',c);}
test('ville vivante : huit quartiers, boulevards, entités Vehicle et objets hors chaussée',()=>{
 const {YUKA,CityMap3D}=fixture(),city=new CityMap3D();assert.equal(city.districts.length,8);assert.equal(city.routes.length,8);assert.equal(city.buildings.length,32);assert.equal(city.trees.length,24);assert.ok(city.lamps.length>=24);
 assert.ok([...city.trees,...city.lamps,city.fairground].every(e=>e instanceof YUKA.Vehicle&&e.maxSpeed===0));
 assert.ok(city.route.points.every(p=>p.x>=-28&&p.x<=28));assert.ok(city.routes.some(r=>r.points.some(p=>p.x===56)));assert.ok(city.routes.some(r=>r.points.some(p=>p.x===-56)));
 assert.ok(city.fairground.position.distanceTo(city.route.frameAt(city.fairground.position).point)>12);
});
test('ciel : nuages dérivent au temps réel, temps invalide ignoré et wrap borné',()=>{
 const {THREE,CityAtmosphere3D}=fixture(),a=new CityAtmosphere3D(new THREE.Scene()),b=new CityAtmosphere3D(new THREE.Scene());
 for(let i=0;i<60;i++)a.update(1/60);for(let i=0;i<30;i++)b.update(1/30);assert.ok(Math.abs(a.clouds[0].group.position.x-b.clouds[0].group.position.x)<1e-8);
 assert.notEqual(a.clouds[0].group.position.x,a.clouds[0].startX);const t=a.time;a.update(NaN);a.update(-1);assert.equal(a.time,t);
 a.time=10000;a.update(.1);assert.ok(a.clouds.every(c=>c.group.position.x>=-130&&c.group.position.x<130));
});
test('fête foraine : roue et carrousel animés, nacelles verticales, état physique inchangé',()=>{
 const {THREE,CityMap3D,CityLifeView3D}=fixture(),city=new CityMap3D(),view={scene:new THREE.Scene(),cityView:{label:()=>new THREE.Group()}};
 const life=new CityLifeView3D(view,city),before=city.fairground.position.clone();life.update(.1);
 assert.ok(life.wheel.rotation.z>0&&life.carousel.rotation.y>0);assert.ok(life.cabins.every(c=>Math.abs(c.rotation.z+life.wheel.rotation.z)<1e-8));assert.ok(city.fairground.position.equals(before));
 const t=life.time;life.update(NaN);assert.equal(life.time,t);assert.equal(life.foliage.length,24);
});
