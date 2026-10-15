import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function fixture(){const c=vm.createContext({console});for(const file of ['libraries/3d/yuka.js','3d/trafficSteering3d.js','3d/trafficContacts3d.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);return vm.runInContext('({YUKA,TrafficSteering3D,TrafficContacts3D})',c);}
function vehicle(s,x,z,vx,vz,bus=false){const v=new s.YUKA.Vehicle();v.position.set(x,0,z);v.velocity.set(vx,0,vz);v.maxForce=20;v.maxSpeed=12;v.isBus=bus;v.collisionRadius=bus?1.16:.7;v.steering=new s.TrafficSteering3D(v);const desired=v.velocity.clone();v.steering.add({active:true,weight:1,calculate(a,f){return f.copy(desired).sub(a.velocity).multiplyScalar(2);}});return v;}
function distanceSwept(a,b,oldA,oldB){const r=oldA.clone().sub(oldB),step=a.position.clone().sub(b.position).sub(r),length=step.squaredLength(),t=length?Math.max(0,Math.min(1,-r.dot(step)/length)):0;return r.add(step.multiplyScalar(t)).length();}
function run(s,vehicles,steps,mission=null){const contacts=new s.TrafficContacts3D();let minimum=Infinity;for(let step=0;step<steps;step++){const old=vehicles.map(v=>v.position.clone());contacts.prepare(vehicles,1/60,mission);for(const v of vehicles){assert.ok(v.steering.planned.length()<=v.maxForce+1e-7);v.update(1/60);}for(let i=0;i<vehicles.length;i++)for(let j=i+1;j<vehicles.length;j++){const margin=distanceSwept(vehicles[i],vehicles[j],old[i],old[j])-s.TrafficContacts3D.radius(vehicles[i])-s.TrafficContacts3D.radius(vehicles[j]);minimum=Math.min(minimum,margin);assert.ok(margin>=-1e-7,`pénétration ${margin} au pas ${step}`);}}return minimum;}
test('contacts : voiture contre bus immobilisé, bus contre voiture, voitures face à face et bus contre bus',()=>{
 const s=fixture();for(const [leftBus,rightBus] of [[false,true],[true,false],[false,false],[true,true]]){const a=vehicle(s,-9,0,10,0,leftBus),b=vehicle(s,0,0,0,0,rightBus);b.service={active:true,target:b.position.clone()};const mission={bus:b};run(s,[a,b],600,mission);assert.ok(b.position.length()<1e-8);}
 const a=vehicle(s,-8,0,6,0),b=vehicle(s,8,0,-6,0);run(s,[a,b],600);
});
test('contacts : carrefour et dépassement latéral avec volumes réels, sans traversée entre deux pas',()=>{
 const s=fixture(),a=vehicle(s,-8,0,6,0),b=vehicle(s,0,-8,0,6);run(s,[a,b],600);
 const slow=vehicle(s,0,0,1,0,true),fast=vehicle(s,-8,2.1,6,0);run(s,[slow,fast],600);assert.ok(fast.position.x>slow.position.x);
});
test('contacts : forces seules, limite, temps invalide, locomotion héritée et force calculée une seule fois',()=>{
 const s=fixture(),a=vehicle(s,-4,0,2,0),b=vehicle(s,0,0,0,0,true),contacts=new s.TrafficContacts3D(),p=a.position.clone(),v=a.velocity.clone();let calls=0;a.steering.behaviors[0].calculate=(agent,f)=>{calls++;return f.set(1,0,0);};
 contacts.prepare([a,b],NaN);assert.equal(calls,0);contacts.prepare([a,b],1/60);assert.ok(a.position.equals(p)&&a.velocity.equals(v));assert.equal(calls,1);assert.equal(a.update,s.YUKA.Vehicle.prototype.update);a.update(1/60);assert.equal(calls,1);
});
test('contacts : création refuse positions occupées et trajectoire de freinage, accepte emplacement libre',()=>{
 const s=fixture(),bus=vehicle(s,0,0,0,0,true),car=vehicle(s,-10,0,10,0);assert.equal(s.TrafficContacts3D.canSpawn(bus.position,.7,[bus]),false);assert.equal(s.TrafficContacts3D.canSpawn(new s.YUKA.Vector3(-7,0,0),.7,[car]),false);assert.equal(s.TrafficContacts3D.canSpawn(new s.YUKA.Vector3(0,0,4),.7,[bus]),true);
});

test('contacts : les contraintes de trafic préservent aussi les barrières et les bords de route',()=>{
 const s=fixture(),a=vehicle(s,-10,2.5,8,1),b=vehicle(s,4,2.5,0,0,true),wall={position:new s.YUKA.Vector3(0,0,2.5),boundingRadius:1.4};
 const route={radius:4.2,frameAt(p){return {point:new s.YUKA.Vector3(p.x,0,0),normal:new s.YUKA.Vector3(0,0,1)};}};
 a.road=b.road={circuit:route};a.safety=b.safety={obstacles:[wall]};const contacts=new s.TrafficContacts3D();
 for(let step=0;step<600;step++){contacts.prepare([a,b],1/60);a.update(1/60);b.update(1/60);for(const v of [a,b]){assert.ok(Math.abs(v.position.z)+s.TrafficContacts3D.radius(v)<4.2);assert.ok(v.position.distanceTo(wall.position)>=wall.boundingRadius+s.TrafficContacts3D.radius(v)-1e-7);}}
});
