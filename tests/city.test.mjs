import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
function fixture(){const c=vm.createContext({console});let seed=42;c.rng=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);vm.runInContext('Math.random=rng',c);
 for(const file of ['libraries/3d/yuka.js','3d/circuit3d.js','3d/cityRoute3d.js','3d/building3d.js','3d/busStop3d.js','3d/passenger3d.js','3d/tree3d.js','3d/streetLamp3d.js','3d/fairground3d.js','3d/shop3d.js','3d/citySolids3d.js','3d/streetNetwork3d.js','3d/cityMap3d.js','3d/busMission3d.js','3d/weightedSteering3d.js','3d/localSeparation3d.js','3d/teacherAvoidance3d.js','3d/obstacle3d.js','3d/barrier3d.js','3d/police3d.js','3d/overtake3d.js','3d/roadContainment3d.js','3d/collisionSafety3d.js','3d/trafficSteering3d.js','3d/trafficContacts3d.js','3d/trafficVehicle3d.js','3d/busService3d.js','3d/bus3d.js','3d/boidRules3d.js','3d/altitudeHold3d.js','3d/flockDrone3d.js','3d/streetNavigation3d.js','3d/townPerson3d.js','3d/robber3d.js','3d/incidentCar3d.js','3d/responseCar3d.js','3d/streetBarricade3d.js','3d/cityIncident3d.js','3d/world3d.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),c);
 return vm.runInContext('({YUKA,CityMap3D,World3D,BusService3D})',c);}
test('ville : réseau de huit itinéraires, entités Vehicle, arrêts sûrs et chemins indépendants',()=>{
 const {YUKA,CityMap3D,World3D}=fixture(),city=new CityMap3D(),world=new World3D(()=>.2,city.route);
 assert.equal(city.routes.length,8);assert.equal(city.stops.length,4);assert.equal(city.buildings.length,32);assert.equal(city.passengers.length,14);
 assert.ok([...city.stops,...city.buildings,...city.passengers].every(e=>e instanceof YUKA.Vehicle));
 for(const route of city.routes){assert.equal(route.points.length,64);assert.ok(route.createPath().loop);const p=route.createPath(),q=route.createPath();assert.notEqual(p,q);assert.ok(route.points.every(p=>Number.isFinite(p.x)));}
 for(const stop of city.stops)assert.ok(stop.position.distanceTo(city.route.frameAt(stop.position).point)+1.1<city.route.radius);
 const car=world.addVehicle(),bus=world.addBus();assert.equal(bus.road.circuit,city.route);assert.ok(city.routes.includes(car.road.circuit));assert.ok(world.mission);
});
test('mission : portes refusées loin ou en mouvement, embarquement 3s et capacité bornée',()=>{
 const {CityMap3D,World3D}=fixture(),city=new CityMap3D(),world=new World3D(()=>0,city.route),bus=world.addBus(),m=world.mission;
 assert.equal(m.start(world.addVehicle()),false);m.start(bus);assert.equal(m.openDoors(),false);
 bus.position.copy(m.stop.position);bus.velocity.set(1,0,0);assert.equal(m.openDoors(),false);bus.velocity.set(0,0,0);assert.equal(m.openDoors(),true);
 m.stop.waiting=20;assert.equal(m.openDoors(),false);m.update(2.99);assert.equal(m.onboard,0);m.update(.01);assert.equal(m.onboard,12);assert.equal(m.visits,1);assert.equal(m.score,110);
 m.update(NaN);assert.equal(m.visits,1);
});

test('création ville : répétition du clic ou de T ne crée jamais de véhicules superposés',()=>{
 const {CityMap3D,World3D}=fixture(),world=new World3D(()=>0,new CityMap3D().route),bus=world.addBus();
 for(let i=0;i<20;i++)i%4===0?world.addBus():world.addVehicle(bus.position.clone());
 for(let i=0;i<world.traffic.length;i++)for(let j=i+1;j<world.traffic.length;j++)assert.ok(world.traffic[i].position.distanceTo(world.traffic[j].position)>=world.traffic[i].collisionRadius+world.traffic[j].collisionRadius+.19);
});

test('ville : les voitures parcourent les huit itinéraires et restent sur leur chaussée',()=>{
 const {CityMap3D,World3D}=fixture(),city=new CityMap3D(),world=new World3D(()=>0,city.route);
 for(let route=0;route<8;route++){world.rng=()=>route/8+.001;world.addVehicle();}
 const before=world.traffic.map(v=>v.position.clone());
 for(let i=0;i<1200;i++){world.update(1/60);for(const car of world.traffic){assert.ok(Number.isFinite(car.position.x));assert.ok(car.getSpeed()<=car.maxSpeed+1e-6);assert.ok(car.position.distanceTo(car.road.circuit.frameAt(car.position).point)+car.boundingRadius<car.road.circuit.radius+.05);}}
 assert.ok(world.traffic.every((v,i)=>v.position.distanceTo(before[i])>5));
});
test('mission : livraison unique, interruption, fin de tournée et redémarrage propre',()=>{
 const {CityMap3D,World3D}=fixture(),city=new CityMap3D(),world=new World3D(()=>0,city.route),bus=world.addBus(),m=world.mission;m.start(bus);
 bus.position.copy(m.stop.position);m.openDoors();bus.velocity.set(1,0,0);m.update(.1);assert.equal(m.state,'driving');assert.equal(m.dwell,0);bus.velocity.set(0,0,0);
 for(let i=0;i<5;i++){bus.position.copy(m.stop.position);assert.equal(m.openDoors(),true);m.update(3);}
 assert.equal(m.state,'complete');assert.equal(m.delivered,14);assert.equal(m.onboard,0);const score=m.score;m.update(10);assert.equal(m.score,score);assert.equal(bus.service.active,false);
 m.start(bus);assert.equal(m.score,100);assert.equal(m.delivered,0);assert.equal(city.stops.reduce((s,p)=>s+p.waiting,0),14);
});
test('mission : steering Arrive borné, pas de mutation et pénalité de freinage avec cooldown',()=>{
 const {YUKA,CityMap3D,World3D}=fixture(),world=new World3D(()=>0,new CityMap3D().route),bus=world.addBus(),m=world.mission;m.start(bus);
 const before=bus.position.clone(),velocity=bus.velocity.clone(),force=new YUKA.Vector3();bus.service.target.copy(bus.position).add(new YUKA.Vector3(0,0,5));bus.service.calculate(bus,force);
 assert.ok(force.length()<=bus.maxForce+1e-8);assert.ok(bus.position.equals(before)&&bus.velocity.equals(velocity));
 m.previousSpeed=4;m.update(.016);assert.equal(m.score,98);m.previousSpeed=4;m.update(.016);assert.equal(m.score,98);
});
test('mission : le bus atteint et dessert cinq arrêts par locomotion héritée',()=>{
 const {CityMap3D,World3D}=fixture(),city=new CityMap3D(),world=new World3D(()=>0,city.route),bus=world.addBus(),m=world.mission;m.start(bus);
 let served=0;
 for(let i=0;i<12000&&m.state!=='complete';i++){
   world.update(1/60);
   if(m.state==='driving'&&bus.position.distanceTo(m.stop.position)<1.5&&bus.getSpeed()<=.35){assert.equal(m.openDoors(),true);served++;}
   assert.ok(bus.getSpeed()<=bus.maxSpeed+1e-6);assert.ok(bus.position.distanceTo(city.route.frameAt(bus.position).point)+bus.boundingRadius<city.route.radius+.05);
 }
 assert.equal(m.state,'complete',`état ${m.state}, visites ${m.visits}, distance ${bus.position.distanceTo(m.stop.position)}, vitesse ${bus.getSpeed()}`);assert.equal(served,5);assert.equal(m.delivered,14);
});
